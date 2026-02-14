import { db } from "@/services/db";
import { bookmarks } from "@/db/schema";

// ── Types matching X API v2 response ────────────────────────────────

type TweetData = {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  attachments?: { media_keys?: string[] };
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
  paginationToken?: string,
): Promise<BookmarksResponse> {
  const params = new URLSearchParams({
    max_results: "100",
    "tweet.fields": "created_at,author_id,attachments",
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

// ── Main sync function ──────────────────────────────────────────────

export async function syncTwitterBookmarks(
  userId: string,
  accessToken: string,
  xUserId: string,
) {
  let paginationToken: string | undefined;
  let synced = 0;
  let skipped = 0;

  do {
    const page = await fetchBookmarksPage(xUserId, accessToken, paginationToken);

    if (!page.data || page.data.length === 0) break;

    // Build lookup maps from includes
    const userMap = new Map<string, UserData>();
    for (const u of page.includes?.users ?? []) {
      userMap.set(u.id, u);
    }

    const mediaMap = new Map<string, MediaData>();
    for (const m of page.includes?.media ?? []) {
      mediaMap.set(m.media_key, m);
    }

    for (const tweet of page.data) {
      const author = userMap.get(tweet.author_id);
      const username = author?.username ?? "unknown";
      const url = `https://x.com/${username}/status/${tweet.id}`;
      const mediaUrls = resolveMedia(tweet, mediaMap, author);

      try {
        const [inserted] = await db
          .insert(bookmarks)
          .values({
            type: "tweet",
            url,
            content: tweet.text,
            author: username,
            mediaUrls: mediaUrls.length > 0 ? mediaUrls : null,
            createdBy: userId,
          })
          .onConflictDoNothing({ target: bookmarks.url })
          .returning({ id: bookmarks.id });

        if (inserted) {
          synced++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    paginationToken = page.meta?.next_token;
  } while (paginationToken);

  return { synced, skipped };
}
