import { eq, and } from "drizzle-orm";
import { db } from "@/services/db";
import { bookmarks, syncLogs } from "@/db/schema";

type InsertedBookmark = {
  id: string;
  title: string | null;
  content: string | null;
  type: string;
};

export class RateLimitError extends Error {
  resetAt: Date | null;
  constructor(resetAt: Date | null) {
    super("Rate limited by X. Try again in a few minutes.");
    this.resetAt = resetAt;
  }
}

export class SyncInProgressError extends Error {
  constructor() {
    super("A sync is already in progress for this user.");
  }
}

// ── Types matching X API v2 response ────────────────────────────────

type TweetEntity = {
  start: number;
  end: number;
  url: string;         // t.co URL
  expanded_url: string; // real URL
  display_url: string;
};

type ReferencedTweet = {
  type: "retweeted" | "quoted" | "replied_to";
  id: string;
};

type TweetData = {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  attachments?: { media_keys?: string[] };
  entities?: { urls?: TweetEntity[] };
  referenced_tweets?: ReferencedTweet[];
  note_tweet?: { text: string; entities?: { urls?: TweetEntity[] } };
  article?: { cover_media?: { media_key: string }; title?: string; description?: string };
};

type UserData = {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
};

type MediaVariant = {
  bit_rate?: number;
  content_type: string;
  url: string;
};

type MediaData = {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
  variants?: MediaVariant[];
};

type BookmarksResponse = {
  data?: TweetData[];
  includes?: {
    users?: UserData[];
    media?: MediaData[];
    tweets?: TweetData[];
  };
  meta?: {
    next_token?: string;
    result_count: number;
  };
};

// ── Fetch one page of bookmarks from X API ──────────────────────────

async function fetchBookmarksPage(
  xUserId: string,
  accessToken: string,
  maxResults: number,
  paginationToken?: string,
): Promise<BookmarksResponse> {
  const params = new URLSearchParams({
    max_results: String(maxResults),
    "tweet.fields": "created_at,author_id,attachments,entities,referenced_tweets,note_tweet,article",
    expansions: "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id,article.cover_media",
    "user.fields": "username,name,profile_image_url",
    "media.fields": "url,preview_image_url,type,variants",
  });
  if (paginationToken) params.set("pagination_token", paginationToken);

  const res = await fetch(
    `https://api.x.com/2/users/${xUserId}/bookmarks?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    if (res.status === 429) {
      const limit = res.headers.get("x-rate-limit-limit");
      const remaining = res.headers.get("x-rate-limit-remaining");
      const reset = res.headers.get("x-rate-limit-reset");
      const body = await res.text();
      const resetDate = reset ? new Date(Number(reset) * 1000) : null;
      console.log(`X API 429 — limit: ${limit}, remaining: ${remaining}, resets: ${resetDate?.toISOString()}, body: ${body}`);
      throw new RateLimitError(resetDate);
    }
    const body = await res.text();
    throw new Error(`X API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ── Resolve media from includes ─────────────────────────────────────

function bestMp4(variants?: MediaVariant[]): string | undefined {
  if (!variants) return undefined;
  const mp4s = variants
    .filter((v) => v.content_type === "video/mp4" && v.bit_rate != null)
    .sort((a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0));
  return mp4s[0]?.url;
}

function resolveMedia(
  tweet: TweetData,
  mediaMap: Map<string, MediaData>,
  author?: UserData,
): { type: string; url: string; videoUrl?: string }[] {
  const result: { type: string; url: string; videoUrl?: string }[] = [];

  if (author?.profile_image_url) {
    result.push({ type: "avatar", url: author.profile_image_url });
  }

  const keys = [
    ...(tweet.attachments?.media_keys ?? []),
    ...(tweet.article?.cover_media?.media_key ? [tweet.article.cover_media.media_key] : []),
  ];
  for (const key of keys) {
    const media = mediaMap.get(key);
    if (!media) continue;
    const url = media.url ?? media.preview_image_url;
    if (!url) continue;

    if (media.type === "video" || media.type === "animated_gif") {
      const videoUrl = bestMp4(media.variants);
      result.push({ type: media.type, url, videoUrl });
    } else {
      result.push({ type: media.type, url });
    }
  }

  return result;
}

// ── URL patterns to strip (media attachments rendered separately) ────

const MEDIA_URL_RE = /https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+\/(photo|video)\/\d+/g;
const STATUS_URL_RE = /https?:\/\/(x\.com|twitter\.com)\/(\w+)\/status\/\d+/g;

// ── Replace t.co URLs with real URLs, strip media URLs ──────────────

function resolveLinks(tweet: TweetData): string {
  let text = tweet.note_tweet?.text ?? tweet.text;
  const entities = tweet.note_tweet?.entities?.urls ?? tweet.entities?.urls ?? [];
  for (const entity of entities) {
    const url = entity.expanded_url.replace(/^http:\/\//, "https://");
    text = text.replace(entity.url, url);
  }
  text = text.replace(MEDIA_URL_RE, "");
  text = text.replace(STATUS_URL_RE, "");
  return text.trim();
}

// ── Check if tweet contains an X article link ───────────────────────

function findArticleUrl(tweet: TweetData): string | null {
  for (const entity of tweet.entities?.urls ?? []) {
    const url = entity.expanded_url.replace(/^http:\/\//, "https://");
    if (url.includes("x.com/i/article/")) return url;
  }
  return null;
}

// ── Resolve referenced tweet (retweet/quote) content ────────────────

function resolveReferencedTweet(
  tweet: TweetData,
  tweetMap: Map<string, TweetData>,
  userMap: Map<string, UserData>,
  mediaMap: Map<string, MediaData>,
): { content: string; media: { type: string; url: string; videoUrl?: string }[] } | null {
  const ref = tweet.referenced_tweets?.find(
    (r) => r.type === "retweeted" || r.type === "quoted",
  );
  if (!ref) return null;

  const refTweet = tweetMap.get(ref.id);
  if (!refTweet) return null;

  const refAuthor = userMap.get(refTweet.author_id);
  const refUsername = refAuthor?.username ?? "unknown";
  const refUrl = `https://x.com/${refUsername}/status/${ref.id}`;
  const refContent = resolveLinks(refTweet);
  const label = ref.type === "retweeted" ? "Retweet" : "Quote";

  const media: { type: string; url: string; videoUrl?: string }[] = [];
  if (refAuthor?.profile_image_url) {
    media.push({ type: "quote_avatar", url: refAuthor.profile_image_url });
  }
  for (const key of refTweet.attachments?.media_keys ?? []) {
    const m = mediaMap.get(key);
    if (!m) continue;
    const url = m.url ?? m.preview_image_url;
    if (!url) continue;
    if (m.type === "video" || m.type === "animated_gif") {
      media.push({ type: `quote_${m.type}`, url, videoUrl: bestMp4(m.variants) });
    } else {
      media.push({ type: `quote_${m.type}`, url });
    }
  }

  return {
    content: `\n\n> ${label} from [@${refUsername}](${refUrl})\n> ${refContent.replace(/\n/g, "\n> ")}`,
    media,
  };
}

// ── Check if this is the first sync ─────────────────────────────────

async function isFirstSync(userId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.type, "tweet"), eq(bookmarks.createdBy, userId)))
    .limit(1);
  return !existing;
}

// ── Concurrency guard ───────────────────────────────────────────────

async function hasInProgressSync(userId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: syncLogs.id })
    .from(syncLogs)
    .where(and(eq(syncLogs.userId, userId), eq(syncLogs.status, "in_progress")))
    .limit(1);
  return !!existing;
}

// ── Main sync function ──────────────────────────────────────────────

export type SyncResult = {
  synced: number;
  status: "completed" | "interrupted";
  rateLimitResetsAt?: Date | null;
  apiCalls: number;
  tweetsTotal: number;
  durationMs: number;
  mode: "initial" | "incremental";
  syncLogId: string;
  insertedBookmarks: InsertedBookmark[];
};

export async function syncTwitterBookmarks(
  userId: string,
  accessToken: string,
  xUserId: string,
  options?: {
    resumeToken?: string;
    syncLogId?: string;
  },
): Promise<SyncResult> {
  // Concurrency guard — skip if resuming (we already have an in-progress log)
  if (!options?.syncLogId && await hasInProgressSync(userId)) {
    throw new SyncInProgressError();
  }

  const isResume = !!options?.resumeToken;
  const firstSync = isResume ? false : await isFirstSync(userId);
  const mode = firstSync ? "initial" : "incremental";
  console.log(`[sync] mode=${mode} user=${userId} resume=${isResume}`);

  const start = Date.now();

  // Create or reuse syncLog
  let syncLogId: string;
  if (options?.syncLogId) {
    syncLogId = options.syncLogId;
  } else {
    const [log] = await db.insert(syncLogs).values({
      userId,
      mode,
      status: "in_progress",
      tweetsTotal: 0,
      tweetsSynced: 0,
      apiCalls: 0,
      cost: 0,
    }).returning({ id: syncLogs.id });
    syncLogId = log.id;
  }

  try {
    const result = firstSync
      ? await initialSync(userId, accessToken, xUserId, syncLogId, options?.resumeToken)
      : await incrementalSync(userId, accessToken, xUserId, syncLogId, options?.resumeToken);

    const durationMs = Date.now() - start;

    // Update syncLog with final status
    await db.update(syncLogs).set({
      status: result.status,
      tweetsTotal: result.tweetsTotal,
      tweetsSynced: result.synced,
      apiCalls: result.apiCalls,
      cost: result.tweetsTotal * 0.005,
      rateLimited: result.status === "interrupted",
      paginationToken: result.paginationToken ?? null,
      rateLimitResetsAt: result.rateLimitResetsAt ?? null,
      durationMs,
    }).where(eq(syncLogs.id, syncLogId));

    console.log(`[sync] done — synced=${result.synced} apiCalls=${result.apiCalls} status=${result.status} duration=${durationMs}ms`);

    return {
      synced: result.synced,
      status: result.status,
      rateLimitResetsAt: result.rateLimitResetsAt,
      apiCalls: result.apiCalls,
      tweetsTotal: result.tweetsTotal,
      durationMs,
      mode,
      syncLogId,
      insertedBookmarks: result.insertedBookmarks,
    };
  } catch (err) {
    // On unexpected error, mark syncLog as completed (not in_progress forever)
    await db.update(syncLogs).set({
      status: "completed",
      durationMs: Date.now() - start,
    }).where(eq(syncLogs.id, syncLogId));
    throw err;
  }
}

// ── Internal result type ────────────────────────────────────────────

type InternalSyncResult = {
  synced: number;
  status: "completed" | "interrupted";
  paginationToken?: string;
  rateLimitResetsAt?: Date | null;
  apiCalls: number;
  tweetsTotal: number;
  insertedBookmarks: InsertedBookmark[];
};

// ── Initial sync: save each page immediately ─────────────────────────

async function initialSync(
  userId: string,
  accessToken: string,
  xUserId: string,
  syncLogId: string,
  resumeToken?: string,
): Promise<InternalSyncResult> {
  let apiCalls = 0;
  let tweetsTotal = 0;
  let synced = 0;
  let paginationToken: string | undefined = resumeToken;
  const allInserted: InsertedBookmark[] = [];

  let batch = 0;
  do {
    batch++;
    try {
      apiCalls++;
      const page = await fetchBookmarksPage(xUserId, accessToken, 80, paginationToken);
      const count = page.data?.length ?? 0;
      tweetsTotal += count;
      console.log(`[sync:initial] batch=${batch} received=${count} hasNext=${!!page.meta?.next_token}`);
      if (!page.data || count === 0) break;

      // Save immediately — nothing lost if rate limited on next page
      const result = await insertTweets(page, userId, false);
      synced += result.synced;
      allInserted.push(...result.insertedBookmarks);
      console.log(`[sync:initial] batch=${batch} inserted=${result.synced}`);

      // Update syncLog progress after each page
      await db.update(syncLogs).set({
        tweetsTotal,
        tweetsSynced: synced,
        apiCalls,
        cost: tweetsTotal * 0.005,
      }).where(eq(syncLogs.id, syncLogId));

      paginationToken = page.meta?.next_token;
    } catch (err) {
      if (err instanceof RateLimitError) {
        console.log(`[sync:initial] rate limited after batch=${batch}, saved ${synced} bookmarks so far`);
        // If rate limited on first request (no data yet), bubble up the error
        // so the caller returns 429 — there's nothing to resume from
        if (batch === 1 && !paginationToken) throw err;
        return {
          synced,
          status: "interrupted",
          paginationToken,
          rateLimitResetsAt: err.resetAt,
          apiCalls,
          tweetsTotal,
          insertedBookmarks: allInserted,
        };
      }
      throw err;
    }
  } while (paginationToken);

  return { synced, status: "completed", apiCalls, tweetsTotal, insertedBookmarks: allInserted };
}

// ── Incremental sync: probe 1, then batches of 10, exit on dup ──────

async function incrementalSync(
  userId: string,
  accessToken: string,
  xUserId: string,
  syncLogId: string,
  resumeToken?: string,
): Promise<InternalSyncResult> {
  let synced = 0;
  let apiCalls = 0;
  let tweetsTotal = 0;
  const allInserted: InsertedBookmark[] = [];

  let paginationToken: string | undefined = resumeToken;

  // If not resuming, do the probe
  if (!resumeToken) {
    apiCalls++;
    const probe = await fetchBookmarksPage(xUserId, accessToken, 1);
    tweetsTotal += probe.data?.length ?? 0;

    if (!probe.data || probe.data.length === 0) {
      console.log("[sync:incremental] probe empty — nothing new");
      return { synced, status: "completed", apiCalls, tweetsTotal, insertedBookmarks: allInserted };
    }

    const probeInserted = await insertTweets(probe, userId);
    synced += probeInserted.synced;
    allInserted.push(...probeInserted.insertedBookmarks);

    if (probeInserted.synced === 0) {
      console.log("[sync:incremental] probe was duplicate — nothing new");
      return { synced, status: "completed", apiCalls, tweetsTotal, insertedBookmarks: allInserted };
    }

    console.log("[sync:incremental] probe found new bookmark, fetching more...");
    paginationToken = probe.meta?.next_token;
  }

  let batch = 0;
  while (paginationToken) {
    batch++;
    try {
      apiCalls++;
      const page = await fetchBookmarksPage(xUserId, accessToken, 10, paginationToken);
      const count = page.data?.length ?? 0;
      tweetsTotal += count;
      console.log(`[sync:incremental] batch=${batch} received=${count}`);
      if (!page.data || count === 0) break;

      const result = await insertTweets(page, userId);
      synced += result.synced;
      allInserted.push(...result.insertedBookmarks);
      console.log(`[sync:incremental] batch=${batch} inserted=${result.synced} dupes=${result.hitDuplicate}`);

      // Update syncLog progress
      await db.update(syncLogs).set({
        tweetsTotal,
        tweetsSynced: synced,
        apiCalls,
        cost: tweetsTotal * 0.005,
      }).where(eq(syncLogs.id, syncLogId));

      if (result.hitDuplicate) break;

      paginationToken = page.meta?.next_token;
    } catch (err) {
      if (err instanceof RateLimitError) {
        console.log(`[sync:incremental] rate limited after batch=${batch} synced=${synced}`);
        return {
          synced,
          status: "interrupted",
          paginationToken,
          rateLimitResetsAt: err.resetAt,
          apiCalls,
          tweetsTotal,
          insertedBookmarks: allInserted,
        };
      }
      throw err;
    }
  }

  return { synced, status: "completed", apiCalls, tweetsTotal, insertedBookmarks: allInserted };
}

// ── Insert a page of tweets, returns count and whether a dup was hit ─

async function insertTweets(
  page: BookmarksResponse,
  userId: string,
  stopOnDuplicate = true,
) {
  let synced = 0;
  let hitDuplicate = false;
  const insertedBookmarks: InsertedBookmark[] = [];

  const userMap = new Map<string, UserData>();
  for (const u of page.includes?.users ?? []) {
    userMap.set(u.id, u);
  }

  const mediaMap = new Map<string, MediaData>();
  for (const m of page.includes?.media ?? []) {
    mediaMap.set(m.media_key, m);
  }

  const tweetMap = new Map<string, TweetData>();
  for (const t of page.includes?.tweets ?? []) {
    tweetMap.set(t.id, t);
  }

  // Reverse so oldest tweets are inserted first (earliest createdAt)
  const tweets = [...(page.data ?? [])].reverse();

  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];
    const author = userMap.get(tweet.author_id);
    const username = author?.username ?? "unknown";
    const url = `https://x.com/${username}/status/${tweet.id}`;
    const mediaUrls = resolveMedia(tweet, mediaMap, author);

    let content = resolveLinks(tweet);

    const ref = resolveReferencedTweet(tweet, tweetMap, userMap, mediaMap);
    if (ref) {
      content += ref.content;
      mediaUrls.push(...ref.media);
    }

    const articleUrl = findArticleUrl(tweet);
    const isArticle = !!tweet.article || !!articleUrl;
    const type = isArticle ? "article" : "tweet";
    const title = isArticle ? (tweet.article?.title ?? null) : null;

    // Parse tweetCreatedAt from X API created_at field
    const tweetCreatedAt = tweet.created_at ? new Date(tweet.created_at) : null;

    try {
      const [inserted] = await db
        .insert(bookmarks)
        .values({
          type,
          title,
          url,
          content,
          author: username,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : null,
          tweetCreatedAt,
          createdBy: userId,
        })
        .onConflictDoNothing({ target: bookmarks.url })
        .returning({ id: bookmarks.id });

      if (inserted) {
        synced++;
        insertedBookmarks.push({ id: inserted.id, title, content, type });
      } else {
        hitDuplicate = true;
        if (stopOnDuplicate) break;
      }
    } catch {
      hitDuplicate = true;
      if (stopOnDuplicate) break;
    }
  }

  return { synced, hitDuplicate, insertedBookmarks };
}
