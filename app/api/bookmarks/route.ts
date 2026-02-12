import { NextResponse } from "next/server";
import { getBookmarksForUser } from "@/server/bookmarks/queries";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const search = searchParams.get("search") || undefined;

  if (!userId)
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  try {
    const result = await getBookmarksForUser(userId, search);
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}
