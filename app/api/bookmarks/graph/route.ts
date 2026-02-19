import { NextResponse } from "next/server";
import { getGraphBookmarks } from "@/server/bookmarks/queries";
import { getUser } from "@/lib/get-user";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const min = parseInt(searchParams.get("min") ?? "3", 10);
  const type = searchParams.get("type") || undefined;

  try {
    const data = await getGraphBookmarks(user.id, min, type);
    return NextResponse.json(data);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to fetch graph data" },
      { status: 500 },
    );
  }
}
