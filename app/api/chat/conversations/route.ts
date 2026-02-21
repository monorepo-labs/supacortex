import { NextResponse } from "next/server";
import { getUser } from "@/lib/get-user";
import { getConversationsForUser } from "@/server/chat/queries";
import {
  createConversation,
  updateConversation,
  deleteConversation,
} from "@/server/chat/mutations";

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await getConversationsForUser(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, sessionId, directory } = await req.json();

  try {
    const result = await createConversation({
      title,
      sessionId,
      directory,
      userId: user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title, sessionId, directory } = await req.json();

  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: { title?: string; sessionId?: string; directory?: string } = {};
  if (title) data.title = title;
  if (sessionId) data.sessionId = sessionId;
  if (directory) data.directory = directory;

  if (Object.keys(data).length === 0)
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 },
    );

  try {
    await updateConversation(id, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
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
    await deleteConversation(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 },
    );
  }
}
