import { db } from "@/services/db";
import { conversations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const createConversation = async (data: {
  title?: string;
  sessionId?: string;
  directory?: string;
  userId: string;
}) => {
  const [result] = await db.insert(conversations).values(data).returning();
  return result;
};

export const updateConversation = async (
  id: string,
  data: { title?: string; sessionId?: string; directory?: string | null },
) => {
  return db.update(conversations).set(data).where(eq(conversations.id, id));
};

export const deleteConversation = async (id: string) => {
  return db.delete(conversations).where(eq(conversations.id, id));
};
