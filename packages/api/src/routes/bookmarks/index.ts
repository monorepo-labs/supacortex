import { Hono } from "hono";
import {
  getBookmarksForAPI,
  getBookmarkById,
} from "@/server/bookmarks/queries";
import { createBookmark, deleteBookmark } from "@/server/bookmarks/mutations";
import { classifyUrlType } from "@/lib/ingest/url-type";
import { scrapeContent } from "@/lib/ingest/scraper";
import { scrapeYouTube } from "@/lib/ingest/youtube-scraper";
import { Env } from "../../types";

export const bookmarks = new Hono<Env>();

bookmarks.get("/", async (c) => {
  const userId = c.get("userId");
  const search = c.req.query("search");
  const groupId = c.req.query("group");
  const limit = parseInt(c.req.query("limit") ?? "100");
  const offset = parseInt(c.req.query("offset") ?? "0");

  try {
    const { data, total } = await getBookmarksForAPI(
      userId,
      search,
      groupId,
      limit,
      offset,
    );
    return c.json({ data, meta: { total, limit, offset } });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to get bookmarks" }, 400);
  }
});

bookmarks.get("/:id", async (c) => {
  const userId = c.get("userId");
  const bookmarkId = c.req.param("id");

  try {
    const data = await getBookmarkById(bookmarkId, userId);
    if (!data) return c.json({ error: "Bookmark not found" }, 404);
    return c.json(data);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to get bookmark" }, 400);
  }
});

bookmarks.post("/", async (c) => {
  const userId = c.get("userId");
  const { url } = await c.req.json();

  if (!url) return c.json({ error: "URL is required" }, 400);

  const type = classifyUrlType(url);

  if (type === "tweet")
    return c.json(
      { error: "Tweets can only be synced via X. Bookmark the tweet on X and it will sync automatically." },
      400,
    );

  try {
    if (type === "youtube") {
      const yt = await scrapeYouTube(url);
      if (!yt) return c.json({ error: "Failed to fetch YouTube video metadata" }, 422);

      const result = await createBookmark({
        url: yt.videoUrl,
        type: "youtube",
        title: yt.title,
        author: yt.author,
        content: yt.transcript,
        mediaUrls: [{ type: "youtube", url: yt.thumbnailUrl, videoUrl: yt.videoUrl }],
        createdBy: userId,
      });
      return c.json(result, 201);
    }

    const scraped = await scrapeContent(url, { stripH1: true });
    if (!scraped) return c.json({ error: "Failed to scrape content from URL" }, 422);

    const mediaUrls = scraped.ogImage
      ? [{ type: "og", url: scraped.ogImage }]
      : null;

    const result = await createBookmark({
      url,
      type,
      title: scraped.title,
      content: scraped.content,
      mediaUrls,
      createdBy: userId,
    });
    return c.json(result, 201);
  } catch (error: unknown) {
    if (error instanceof Error && (error as Error & { cause?: { code?: string } }).cause?.code === "23505")
      return c.json({ error: "This URL is already in your library" }, 409);
    console.error(error);
    return c.json({ error: "Failed to create bookmark" }, 500);
  }
});

bookmarks.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const bookmarkId = c.req.param("id");

  const existing = await getBookmarkById(bookmarkId, userId);
  if (!existing) return c.json({ error: "Bookmark not found" }, 404);

  try {
    await deleteBookmark(bookmarkId);
    return c.json({ message: "Bookmark deleted" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to delete bookmark" }, 500);
  }
});
