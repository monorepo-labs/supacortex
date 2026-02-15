import { eq, and } from "drizzle-orm";
import { db } from "@/services/db";
import { bookmarks } from "@/db/schema";
import { scrapeContent } from "@/lib/ingest/scraper";

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

  const keys = tweet.attachments?.media_keys ?? [];
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
  text = text.replace(MEDIA_URL_RE, "").trim();
  return text;
}

// ── Check if tweet contains an X article link ───────────────────────

function findArticleUrl(tweet: TweetData): string | null {
  for (const entity of tweet.entities?.urls ?? []) {
    const url = entity.expanded_url.replace(/^http:\/\//, "https://");
    if (url.includes("x.com/i/article/")) return url;
  }
  return null;
}

// ── Extract first external (non-X) URL from tweet for enrichment ────

function findExternalUrl(tweet: TweetData): string | null {
  for (const entity of tweet.entities?.urls ?? []) {
    const url = entity.expanded_url.replace(/^http:\/\//, "https://");
    try {
      const { hostname } = new URL(url);
      if (hostname.includes("x.com") || hostname.includes("twitter.com")) continue;
      return url;
    } catch {
      continue;
    }
  }
  return null;
}

// ── Enrich a tweet with scraped link content ────────────────────────

async function enrichWithLink(externalUrl: string): Promise<string | null> {
  try {
    const scraped = await scrapeContent(externalUrl);
    if (!scraped?.content) return null;
    const domain = new URL(externalUrl).hostname.replace("www.", "");
    const title = scraped.title ? `**${scraped.title}** (${domain})` : domain;
    const snippet = scraped.content.slice(0, 500);
    return `\n\n---\n${title}\n${snippet}`;
  } catch {
    return null;
  }
}

// ── Resolve referenced tweet (retweet/quote) content ────────────────

function resolveReferencedTweet(
  tweet: TweetData,
  tweetMap: Map<string, TweetData>,
  userMap: Map<string, UserData>,
): string | null {
  const ref = tweet.referenced_tweets?.find(
    (r) => r.type === "retweeted" || r.type === "quoted",
  );
  if (!ref) return null;

  const refTweet = tweetMap.get(ref.id);
  if (!refTweet) return null;

  const refAuthor = userMap.get(refTweet.author_id);
  const refUsername = refAuthor?.username ?? "unknown";
  const refContent = resolveLinks(refTweet);
  const label = ref.type === "retweeted" ? "Retweet" : "Quote";

  return `\n\n> ${label} from @${refUsername}:\n> ${refContent.replace(/\n/g, "\n> ")}`;
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

// ── Main sync function ──────────────────────────────────────────────

export async function syncTwitterBookmarks(
  userId: string,
  accessToken: string,
  xUserId: string,
) {
  const firstSync = await isFirstSync(userId);
  console.log(`[sync] mode=${firstSync ? "initial" : "incremental"} user=${userId}`);

  const result = firstSync
    ? await initialSync(userId, accessToken, xUserId)
    : await incrementalSync(userId, accessToken, xUserId);

  console.log(`[sync] done — synced=${result.synced} rateLimited=${result.rateLimited}`);
  return result;
}

// ── First sync: batches of 100, no early exit ───────────────────────

async function initialSync(
  userId: string,
  accessToken: string,
  xUserId: string,
) {
  let synced = 0;
  let paginationToken: string | undefined;

  let batch = 0;
  do {
    batch++;
    try {
      const page = await fetchBookmarksPage(xUserId, accessToken, 100, paginationToken);
      const count = page.data?.length ?? 0;
      console.log(`[sync:initial] batch=${batch} received=${count} hasNext=${!!page.meta?.next_token}`);
      if (!page.data || count === 0) break;

      const result = await insertTweets(page, userId, false);
      synced += result.synced;
      console.log(`[sync:initial] batch=${batch} inserted=${result.synced} dupes=${result.hitDuplicate}`);

      paginationToken = page.meta?.next_token;
    } catch (err) {
      if (err instanceof RateLimitError) {
        console.log(`[sync:initial] rate limited after batch=${batch} synced=${synced}`);
        return { synced, rateLimited: true, resetAt: err.resetAt };
      }
      throw err;
    }
  } while (paginationToken);

  return { synced, rateLimited: false };
}

// ── Incremental sync: probe 1, then batches of 10, exit on dup ──────

async function incrementalSync(
  userId: string,
  accessToken: string,
  xUserId: string,
) {
  let synced = 0;

  // Probe with 1 tweet to check if there's anything new
  const probe = await fetchBookmarksPage(xUserId, accessToken, 1);
  if (!probe.data || probe.data.length === 0) {
    console.log("[sync:incremental] probe empty — nothing new");
    return { synced, rateLimited: false };
  }

  const probeInserted = await insertTweets(probe, userId);
  synced += probeInserted.synced;

  if (probeInserted.synced === 0) {
    console.log("[sync:incremental] probe was duplicate — nothing new");
    return { synced, rateLimited: false };
  }

  console.log("[sync:incremental] probe found new bookmark, fetching more...");

  // Fetch in batches of 10, stop on first duplicate
  let paginationToken = probe.meta?.next_token;
  let batch = 0;

  while (paginationToken) {
    batch++;
    try {
      const page = await fetchBookmarksPage(xUserId, accessToken, 10, paginationToken);
      const count = page.data?.length ?? 0;
      console.log(`[sync:incremental] batch=${batch} received=${count}`);
      if (!page.data || count === 0) break;

      const result = await insertTweets(page, userId);
      synced += result.synced;
      console.log(`[sync:incremental] batch=${batch} inserted=${result.synced} dupes=${result.hitDuplicate}`);

      if (result.hitDuplicate) break;

      paginationToken = page.meta?.next_token;
    } catch (err) {
      if (err instanceof RateLimitError) {
        console.log(`[sync:incremental] rate limited after batch=${batch} synced=${synced}`);
        return { synced, rateLimited: true, resetAt: err.resetAt };
      }
      throw err;
    }
  }

  return { synced, rateLimited: false };
}

// ── Insert a page of tweets, returns count and whether a dup was hit ─

async function insertTweets(
  page: BookmarksResponse,
  userId: string,
  stopOnDuplicate = true,
) {
  let synced = 0;
  let hitDuplicate = false;

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

  // Pre-fetch link enrichments in parallel for all tweets in this batch
  const tweets = page.data ?? [];
  const enrichments = await Promise.all(
    tweets.map((tweet) => {
      const externalUrl = findExternalUrl(tweet);
      return externalUrl ? enrichWithLink(externalUrl) : Promise.resolve(null);
    }),
  );

  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];
    const author = userMap.get(tweet.author_id);
    const username = author?.username ?? "unknown";
    const url = `https://x.com/${username}/status/${tweet.id}`;
    const mediaUrls = resolveMedia(tweet, mediaMap, author);

    // Build content: resolved links + referenced tweet + enrichment
    let content = resolveLinks(tweet);

    const refContent = resolveReferencedTweet(tweet, tweetMap, userMap);
    if (refContent) content += refContent;

    if (enrichments[i]) content += enrichments[i];

    // Detect article type — from API field or URL pattern
    const isArticle = !!tweet.article || !!findArticleUrl(tweet);
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
      } else {
        hitDuplicate = true;
        if (stopOnDuplicate) break;
      }
    } catch {
      hitDuplicate = true;
      if (stopOnDuplicate) break;
    }
  }

  return { synced, hitDuplicate };
}
