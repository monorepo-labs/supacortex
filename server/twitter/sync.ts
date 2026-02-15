import { eq, and } from "drizzle-orm";
import { db } from "@/services/db";
import { bookmarks } from "@/db/schema";

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

type TweetData = {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  attachments?: { media_keys?: string[] };
  entities?: { urls?: TweetEntity[] };
};

type UserData = {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
};

type MediaData = {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
};

type BookmarksResponse = {
  data?: TweetData[];
  includes?: {
    users?: UserData[];
    media?: MediaData[];
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
    "tweet.fields": "created_at,author_id,attachments,entities",
    expansions: "author_id,attachments.media_keys",
    "user.fields": "username,name,profile_image_url",
    "media.fields": "url,preview_image_url,type",
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

function resolveMedia(
  tweet: TweetData,
  mediaMap: Map<string, MediaData>,
  author?: UserData,
): { type: string; url: string }[] {
  const result: { type: string; url: string }[] = [];

  if (author?.profile_image_url) {
    result.push({ type: "avatar", url: author.profile_image_url });
  }

  const keys = tweet.attachments?.media_keys ?? [];
  for (const key of keys) {
    const media = mediaMap.get(key);
    if (!media) continue;
    const url = media.url ?? media.preview_image_url;
    if (url) result.push({ type: media.type, url });
  }

  return result;
}

// ── Replace t.co URLs with real URLs ────────────────────────────────

function resolveLinks(tweet: TweetData): string {
  let text = tweet.text;
  for (const entity of tweet.entities?.urls ?? []) {
    text = text.replace(entity.url, entity.expanded_url);
  }
  return text;
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

  return firstSync
    ? initialSync(userId, accessToken, xUserId)
    : incrementalSync(userId, accessToken, xUserId);
}

// ── First sync: batches of 100, no early exit ───────────────────────

async function initialSync(
  userId: string,
  accessToken: string,
  xUserId: string,
) {
  let synced = 0;
  let paginationToken: string | undefined;

  do {
    try {
      const page = await fetchBookmarksPage(xUserId, accessToken, 100, paginationToken);
      if (!page.data || page.data.length === 0) break;

      const result = await insertTweets(page, userId);
      synced += result.synced;

      paginationToken = page.meta?.next_token;
    } catch (err) {
      if (err instanceof RateLimitError) {
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
  if (!probe.data || probe.data.length === 0) return { synced, rateLimited: false };

  const probeInserted = await insertTweets(probe, userId);
  synced += probeInserted.synced;

  // Probe was a duplicate — nothing new
  if (probeInserted.synced === 0) return { synced, rateLimited: false };

  // Fetch in batches of 10, stop on first duplicate
  let paginationToken = probe.meta?.next_token;

  while (paginationToken) {
    try {
      const page = await fetchBookmarksPage(xUserId, accessToken, 10, paginationToken);
      if (!page.data || page.data.length === 0) break;

      const result = await insertTweets(page, userId);
      synced += result.synced;

      if (result.hitDuplicate) break;

      paginationToken = page.meta?.next_token;
    } catch (err) {
      if (err instanceof RateLimitError) {
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

  for (const tweet of page.data ?? []) {
    const author = userMap.get(tweet.author_id);
    const username = author?.username ?? "unknown";
    const url = `https://x.com/${username}/status/${tweet.id}`;
    const mediaUrls = resolveMedia(tweet, mediaMap, author);
    const content = resolveLinks(tweet);

    try {
      const [inserted] = await db
        .insert(bookmarks)
        .values({
          type: "tweet",
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
        break;
      }
    } catch {
      hitDuplicate = true;
      break;
    }
  }

  return { synced, hitDuplicate };
}
