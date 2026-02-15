import { NextResponse } from "next/server";
import { getBookmarksForUser } from "@/server/bookmarks/queries";
import { getUser } from "@/lib/get-user";
import { createBookmark, deleteBookmark, updateBookmarkPosition, updateGridLayout, resetGridLayout } from "@/server/bookmarks/mutations";
import { classifyUrlType } from "@/lib/ingest/url-type";
import { scrapeContent } from "@/lib/ingest/scraper";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const groupId = searchParams.get("group") || undefined;

  try {
    const result = await getBookmarksForUser(user.id, search, groupId);
    return NextResponse.json(result);
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
    return NextResponse.json(result);
  } catch (error) {
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
