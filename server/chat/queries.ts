import { db } from "@/services/db";
import { conversations, messages } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export const getConversationsForUser = async (userId: string) => {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
};

export const getMessagesForConversation = async (conversationId: string) => {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
};
