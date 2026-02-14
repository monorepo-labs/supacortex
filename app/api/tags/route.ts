import { NextResponse } from "next/server";
import { getUser } from "@/lib/get-user";
import { getTagsForUser } from "@/server/tags/queries";
import { createTag, updateTag } from "@/server/tags/mutations";

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

  const { id, name, color, icon } = await req.json();

  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: { name?: string; color?: string; icon?: string } = {};
  if (name) data.name = name;
  if (color) data.color = color;
  if (icon) data.icon = icon;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  try {
    await updateTag(id, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 },
    );
  }
}
