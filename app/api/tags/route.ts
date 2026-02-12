import { NextResponse } from "next/server";
import { getUser } from "@/lib/get-user";
import { getTagsForUser } from "@/server/tags/queries";

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await getTagsForUser(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}
