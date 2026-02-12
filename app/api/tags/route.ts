import { NextResponse } from "next/server";
import { getTagsForUser } from "@/server/tags/queries";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId)
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  try {
    const result = await getTagsForUser(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }

}
