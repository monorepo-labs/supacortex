import { NextResponse } from "next/server";
import { getUser } from "@/lib/get-user";
import { getTagsForUser } from "@/server/tags/queries";
import { createTag, renameTag } from "@/server/tags/mutations";

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

export async function POST(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await req.json();

  try {
    const result = await createTag({ name, color, createdBy: user.id });
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name } = await req.json();

  if (!id || !name)
    return NextResponse.json({ error: "id and name required" }, { status: 400 });

  try {
    await renameTag(id, name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to rename tag" },
      { status: 500 },
    );
  }
}
