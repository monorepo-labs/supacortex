import { NextResponse } from "next/server";
import { getBookmarksForUser } from "@/server/bookmarks/queries";
import { getUser } from "@/lib/get-user";
import { createBookmark, deleteBookmark, updateBookmarkPosition, updateGridLayout, resetGridLayout } from "@/server/bookmarks/mutations";
import { classifyUrlType } from "@/lib/ingest/url-type";
import { scrapeContent } from "@/lib/ingest/scraper";
import { scrapeYouTube } from "@/lib/ingest/youtube-scraper";
import { categorizeBookmarks } from "@/lib/ingest/categorize";
import { getGroupsForUser } from "@/server/groups/queries";
import { addBookmarksToGroups } from "@/server/groups/bookmark-groups";

async function autoCategorize(bookmark: { id: string; title: string | null; content: string | null; type: string }, userId: string) {
  try {
    const groups = await getGroupsForUser(userId);
    if (groups.length === 0) return;

    const matches = await categorizeBookmarks([bookmark], groups);
    const groupIds = matches.get(bookmark.id);
    if (groupIds && groupIds.length > 0) {
      await addBookmarksToGroups([bookmark.id], groupIds);
    }
  } catch (error) {
    console.error("[auto-categorize] failed (non-blocking):", error);
  }
}

export async function GET(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const groupId = searchParams.get("group") || undefined;
  const limit = searchParams.has("limit") ? Number(searchParams.get("limit")) : undefined;
  const offset = searchParams.has("offset") ? Number(searchParams.get("offset")) : undefined;

  try {
    const { data, total } = await getBookmarksForUser(user.id, search, groupId, limit, offset);
    return NextResponse.json({ data, total });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.url)
    return NextResponse.json({ error: "URL is required" }, { status: 400 });

  const type = classifyUrlType(body.url);

  if (type === "tweet")
    return NextResponse.json(
      { error: "Tweets can only be synced via X API. Bookmark the tweet on X and it will sync automatically." },
      { status: 400 },
    );

  if (type === "youtube") {
    const yt = await scrapeYouTube(body.url);
    if (!yt)
      return NextResponse.json(
        { error: "Failed to fetch YouTube video metadata. The video may be private or deleted." },
        { status: 422 },
      );

    try {
      const result = await createBookmark({
        url: yt.videoUrl,
        type: "youtube",
        title: yt.title,
        author: yt.author,
        content: yt.transcript,
        mediaUrls: [{ type: "youtube", url: yt.thumbnailUrl, videoUrl: yt.videoUrl }],
        createdBy: user.id,
      });
      await autoCategorize({ id: result.id, title: yt.title, content: null, type: "youtube" }, user.id);
      return NextResponse.json(result);
    } catch (error: any) {
      if (error?.cause?.code === "23505") {
        return NextResponse.json(
          { error: "This URL is already in your library" },
          { status: 409 },
        );
      }
      console.log(error);
      return NextResponse.json(
        { error: "Failed to create bookmark" },
        { status: 500 },
      );
    }
  }

  const scraped = await scrapeContent(body.url, { stripH1: true });
  if (!scraped)
    return NextResponse.json(
      { error: "Failed to scrape content from URL" },
      { status: 422 },
    );

  const mediaUrls = scraped.ogImage
    ? [{ type: "og", url: scraped.ogImage }]
    : null;

  try {
    const result = await createBookmark({
      url: body.url,
      type,
      title: scraped.title,
      content: scraped.content,
      mediaUrls,
      createdBy: user.id,
    });
    await autoCategorize({ id: result.id, title: scraped.title, content: null, type }, user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.cause?.code === "23505") {
      return NextResponse.json(
        { error: "This URL is already in your library" },
        { status: 409 },
      );
    }
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  try {
    // Reset grid layout
    if (body.resetGrid) {
      await resetGridLayout(user.id);
      return NextResponse.json({ ok: true });
    }

    // Grid layout batch update
    if (body.layout && Array.isArray(body.layout)) {
      await updateGridLayout(body.layout);
      return NextResponse.json({ ok: true });
    }

    // Canvas position update (single bookmark)
    const { id, positionX, positionY } = body;
    if (!id || positionX == null || positionY == null)
      return NextResponse.json({ error: "id, positionX, positionY required" }, { status: 400 });

    await updateBookmarkPosition(id, positionX, positionY);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await deleteBookmark(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Failed to delete bookmark" }, { status: 500 });
  }
}
