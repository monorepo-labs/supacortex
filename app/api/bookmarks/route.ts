import { NextResponse } from "next/server";
import { getBookmarksForUser } from "@/server/bookmarks/queries";
import { getUser } from "@/lib/get-user";
import { createBookmark } from "@/server/bookmarks/mutations";
import { classifyUrlType } from "@/lib/ingest/url-type";
import { scrapeContent } from "@/lib/ingest/scraper";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;

  try {
    const result = await getBookmarksForUser(user.id, search);
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

  const scraped = await scrapeContent(body.url);
  if (!scraped)
    return NextResponse.json(
      { error: "Failed to scrape content from URL" },
      { status: 422 },
    );

  try {
    const result = await createBookmark({
      url: body.url,
      type,
      title: scraped.data.title,
      content: scraped.data.content,
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
