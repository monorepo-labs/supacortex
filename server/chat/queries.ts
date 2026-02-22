import { db } from "@/services/db";
import { conversations, messages } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export const getConversationsForUser = async (userId: string) => {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
};

/** Returns the conversation only if it belongs to the given user */
export const getConversationForUser = async (id: string, userId: string) => {
  const [result] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return result ?? null;
};

export const getMessagesForConversation = async (conversationId: string) => {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
};
