import { NextResponse } from "next/server";
import { getUser } from "@/lib/get-user";
import { getMessagesForConversation, getConversationForUser } from "@/server/chat/queries";
import { createMessage } from "@/server/chat/mutations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const conv = await getConversationForUser(id, user.id);
  if (!conv)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const result = await getMessagesForConversation(id);
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const conv = await getConversationForUser(id, user.id);
  if (!conv)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { role, content, attachments } = await req.json();

  if (!role || !content)
    return NextResponse.json(
      { error: "role and content required" },
      { status: 400 },
    );

  try {
    const result = await createMessage({
      conversationId: id,
      role,
      content,
      attachments: attachments?.length ? attachments : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 },
    );
  }
}
