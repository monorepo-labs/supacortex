import { NextResponse } from "next/server";
import { getUser } from "@/lib/get-user";
import {
  addBookmarksToGroups,
  removeBookmarksFromGroups,
} from "@/server/groups/bookmark-groups";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookmarkIds, groupIds } = await req.json();

  if (!Array.isArray(bookmarkIds) || !Array.isArray(groupIds))
    return NextResponse.json(
      { error: "bookmarkIds and groupIds arrays required" },
      { status: 400 },
    );

  try {
    await addBookmarksToGroups(bookmarkIds, groupIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to add bookmarks to groups" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookmarkIds, groupIds } = await req.json();

  if (!Array.isArray(bookmarkIds) || !Array.isArray(groupIds))
    return NextResponse.json(
      { error: "bookmarkIds and groupIds arrays required" },
      { status: 400 },
    );

  try {
    await removeBookmarksFromGroups(bookmarkIds, groupIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to remove bookmarks from groups" },
      { status: 500 },
    );
  }
}
