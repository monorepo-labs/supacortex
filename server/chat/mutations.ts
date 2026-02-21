import { db } from "@/services/db";
import { conversations, messages } from "@/db/schema";
import { eq } from "drizzle-orm";

export const createConversation = async (data: {
  title?: string;
  sessionId?: string;
  userId: string;
}) => {
  const [result] = await db.insert(conversations).values(data).returning();
  return result;
};

export const updateConversation = async (
  id: string,
  data: { title?: string; sessionId?: string },
) => {
  return db.update(conversations).set(data).where(eq(conversations.id, id));
};

export const deleteConversation = async (id: string) => {
  return db.delete(conversations).where(eq(conversations.id, id));
};

export const createMessage = async (data: {
  conversationId: string;
  role: string;
  content: string;
}) => {
  const [result] = await db.insert(messages).values(data).returning();
  // Bump conversation updatedAt so newest conversations sort first
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, data.conversationId));
  return result;
};
