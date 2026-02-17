import { eq, and } from "drizzle-orm";
import { db } from "@/services/db";
import { bookmarks } from "@/db/schema";
import { categorizeBookmarks } from "@/lib/ingest/categorize";
import { suggestGroups, GROUP_COLORS } from "@/lib/ingest/suggest-groups";
import { getGroupsForUser } from "@/server/groups/queries";
import { createGroup } from "@/server/groups/mutations";
import { addBookmarksToGroups } from "@/server/groups/bookmark-groups";

type InsertedBookmark = {
  id: string;
  title: string | null;
  content: string | null;
  type: string;
};



export class RateLimitError extends Error {
  resetAt: Date | null;
  constructor(resetAt: Date | null) {
    const msg = resetAt
      ? `X API rate limited. Try again at ${resetAt.toLocaleTimeString()}`
      : "X API rate limited. Try again in a few minutes.";
    super(msg);
    this.resetAt = resetAt;
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
      const resetDate = reset ? new Date(Number(reset) * 1000) : null;
      console.log(`X API rate limited — limit: ${limit}, remaining: ${remaining}, resets: ${resetDate?.toISOString()}`);
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

  // Collect media keys from attachments + article cover
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
  // Use note_tweet for long tweets (280+ chars), fallback to text
  let text = tweet.note_tweet?.text ?? tweet.text;
  const entities = tweet.note_tweet?.entities?.urls ?? tweet.entities?.urls ?? [];
  for (const entity of entities) {
    const url = entity.expanded_url.replace(/^http:\/\//, "https://");
    text = text.replace(entity.url, url);
  }
  // Strip photo/video attachment URLs (already in mediaUrls)
  text = text.replace(MEDIA_URL_RE, "");
  // Strip quoted/retweeted status URLs (rendered in referenced tweet block)
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

  // Resolve quote tweet media with "quote_" prefix types
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

// ── Auto-categorize synced bookmarks ─────────────────────────────────

async function autoCategorizeSync(userId: string, inserted: InsertedBookmark[]) {
  let groups = await getGroupsForUser(userId);

  // If 10+ new bookmarks, suggest new groups first
  if (inserted.length >= 10) {
    const existingNames = groups.map((g) => g.name);
    const suggested = await suggestGroups(inserted, existingNames);

    if (suggested.length > 0) {
      console.log(`[sync:categorize] creating ${suggested.length} new groups: ${suggested.join(", ")}`);
      for (let i = 0; i < suggested.length; i++) {
        const color = GROUP_COLORS[(groups.length + i) % GROUP_COLORS.length];
        await createGroup({ name: suggested[i], color, createdBy: userId });
      }
      // Refresh groups to include newly created ones
      groups = await getGroupsForUser(userId);
    }
  }

  if (groups.length === 0) return;

  // Categorize all inserted bookmarks
  const matches = await categorizeBookmarks(inserted, groups);
  console.log(`[sync:categorize] matched ${matches.size}/${inserted.length} bookmarks`);

  // Bulk assign — group by groupId for efficiency
  for (const [bookmarkId, groupIds] of matches) {
    await addBookmarksToGroups([bookmarkId], groupIds);
  }
}

// ── Main sync function ──────────────────────────────────────────────

export type SyncResult = {
  synced: number;
  rateLimited: boolean;
  resetAt?: Date | null;
  apiCalls: number;
  tweetsTotal: number;
  durationMs: number;
  mode: "initial" | "incremental";
};

export async function syncTwitterBookmarks(
  userId: string,
  accessToken: string,
  xUserId: string,
): Promise<SyncResult> {
  const firstSync = await isFirstSync(userId);
  const mode = firstSync ? "initial" : "incremental";
  console.log(`[sync] mode=${mode} user=${userId}`);

  const start = Date.now();
  const result = firstSync
    ? await initialSync(userId, accessToken, xUserId)
    : await incrementalSync(userId, accessToken, xUserId);

  // Auto-categorize newly synced bookmarks
  if (result.insertedBookmarks.length > 0) {
    try {
      await autoCategorizeSync(userId, result.insertedBookmarks);
    } catch (error) {
      console.error("[sync:categorize] failed (non-blocking):", error);
    }
  }

  const durationMs = Date.now() - start;

  console.log(`[sync] done — synced=${result.synced} apiCalls=${result.apiCalls} tweetsTotal=${result.tweetsTotal} rateLimited=${result.rateLimited} duration=${durationMs}ms`);
  return { ...result, durationMs, mode };
}

// ── First sync: batches of 100, no early exit ───────────────────────

async function initialSync(
  userId: string,
  accessToken: string,
  xUserId: string,
) {
  let apiCalls = 0;
  let tweetsTotal = 0;
  let paginationToken: string | undefined;
  const pages: BookmarksResponse[] = [];
  const allInserted: InsertedBookmark[] = [];

  // Fetch all pages first (API returns newest → oldest)
  let batch = 0;
  do {
    batch++;
    try {
      const page = await fetchBookmarksPage(xUserId, accessToken, 80, paginationToken);
      apiCalls++;
      const count = page.data?.length ?? 0;
      tweetsTotal += count;
      console.log(`[sync:initial] fetch batch=${batch} received=${count} hasNext=${!!page.meta?.next_token}`);
      if (!page.data || count === 0) break;

      pages.push(page);
      paginationToken = page.meta?.next_token;
    } catch (err) {
      if (err instanceof RateLimitError) {
        console.log(`[sync:initial] rate limited after batch=${batch}, inserting ${pages.length} pages collected so far`);
        // Insert what we have so far, oldest first
        let synced = 0;
        for (const page of pages.reverse()) {
          const result = await insertTweets(page, userId, false);
          synced += result.synced;
          allInserted.push(...result.insertedBookmarks);
        }
        return { synced, rateLimited: true, resetAt: err.resetAt, apiCalls, tweetsTotal, insertedBookmarks: allInserted };
      }
      throw err;
    }
  } while (paginationToken);

  // Insert in reverse order so oldest tweets get earliest createdAt
  let synced = 0;
  for (let i = pages.length - 1; i >= 0; i--) {
    const result = await insertTweets(pages[i], userId, false);
    synced += result.synced;
    allInserted.push(...result.insertedBookmarks);
    console.log(`[sync:initial] insert batch=${pages.length - i}/${pages.length} inserted=${result.synced}`);
  }

  return { synced, rateLimited: false, apiCalls, tweetsTotal, insertedBookmarks: allInserted };
}

// ── Incremental sync: probe 1, then batches of 10, exit on dup ──────

async function incrementalSync(
  userId: string,
  accessToken: string,
  xUserId: string,
) {
  let synced = 0;
  let apiCalls = 0;
  let tweetsTotal = 0;
  const allInserted: InsertedBookmark[] = [];

  // Probe with 1 tweet to check if there's anything new
  const probe = await fetchBookmarksPage(xUserId, accessToken, 1);
  apiCalls++;
  tweetsTotal += probe.data?.length ?? 0;

  if (!probe.data || probe.data.length === 0) {
    console.log("[sync:incremental] probe empty — nothing new");
    return { synced, rateLimited: false, apiCalls, tweetsTotal, insertedBookmarks: allInserted };
  }

  const probeInserted = await insertTweets(probe, userId);
  synced += probeInserted.synced;
  allInserted.push(...probeInserted.insertedBookmarks);

  if (probeInserted.synced === 0) {
    console.log("[sync:incremental] probe was duplicate — nothing new");
    return { synced, rateLimited: false, apiCalls, tweetsTotal, insertedBookmarks: allInserted };
  }

  console.log("[sync:incremental] probe found new bookmark, fetching more...");

  // Fetch in batches of 10, stop on first duplicate
  let paginationToken = probe.meta?.next_token;
  let batch = 0;

  while (paginationToken) {
    batch++;
    try {
      const page = await fetchBookmarksPage(xUserId, accessToken, 10, paginationToken);
      apiCalls++;
      const count = page.data?.length ?? 0;
      tweetsTotal += count;
      console.log(`[sync:incremental] batch=${batch} received=${count}`);
      if (!page.data || count === 0) break;

      const result = await insertTweets(page, userId);
      synced += result.synced;
      allInserted.push(...result.insertedBookmarks);
      console.log(`[sync:incremental] batch=${batch} inserted=${result.synced} dupes=${result.hitDuplicate}`);

      if (result.hitDuplicate) break;

      paginationToken = page.meta?.next_token;
    } catch (err) {
      if (err instanceof RateLimitError) {
        console.log(`[sync:incremental] rate limited after batch=${batch} synced=${synced}`);
        return { synced, rateLimited: true, resetAt: err.resetAt, apiCalls, tweetsTotal, insertedBookmarks: allInserted };
      }
      throw err;
    }
  }

  return { synced, rateLimited: false, apiCalls, tweetsTotal, insertedBookmarks: allInserted };
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

  // Referenced tweets from includes (retweets, quotes)
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

    // Build content: resolved links + referenced tweet + enrichment
    let content = resolveLinks(tweet);

    const ref = resolveReferencedTweet(tweet, tweetMap, userMap, mediaMap);
    if (ref) {
      content += ref.content;
      mediaUrls.push(...ref.media);
    }

    // Detect article type — from API field or URL pattern
    const articleUrl = findArticleUrl(tweet);
    const isArticle = !!tweet.article || !!articleUrl;
    const type = isArticle ? "article" : "tweet";
    const title = isArticle ? (tweet.article?.title ?? null) : null;

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
