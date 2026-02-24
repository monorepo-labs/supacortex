import { db } from "@/services/db";
import { memory, memoryInsertSchema } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import z from "zod";

export const createMemory = async (
  entry: z.infer<typeof memoryInsertSchema>,
) => {
  const [result] = await db.insert(memory).values(entry).returning();
  return result;
};

export const updateMemory = async (
  id: string,
  userId: string,
  entry: Partial<z.infer<typeof memoryInsertSchema>>,
) => {
  const [result] = await db
    .update(memory)
    .set({ ...entry, updatedAt: new Date() })
    .where(and(eq(memory.id, id), eq(memory.createdBy, userId)))
    .returning();
  return result;
};

export const deleteMemory = async (id: string, userId: string) => {
  return db
    .delete(memory)
    .where(and(eq(memory.id, id), eq(memory.createdBy, userId)));
};
