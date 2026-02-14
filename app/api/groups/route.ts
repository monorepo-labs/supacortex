import { NextResponse } from "next/server";
import { getUser } from "@/lib/get-user";
import { getGroupsForUser } from "@/server/groups/queries";
import { createGroup, updateGroup, deleteGroup } from "@/server/groups/mutations";

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await getGroupsForUser(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
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
    const result = await createGroup({ name, color, createdBy: user.id });
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create group" },
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
    await updateGroup(id, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 },
    );
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
    await deleteGroup(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 },
    );
  }
}
