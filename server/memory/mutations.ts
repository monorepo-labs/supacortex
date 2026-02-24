import { db } from "@/services/db";
import { memory, memoryInsertSchema } from "@/db/schema";
import { eq } from "drizzle-orm";
import z from "zod";

export const createMemory = async (
  entry: z.infer<typeof memoryInsertSchema>,
) => {
  const [result] = await db.insert(memory).values(entry).returning();
  return result;
};

export const updateMemory = async (
  id: string,
  entry: Partial<z.infer<typeof memoryInsertSchema>>,
) => {
  const [result] = await db
    .update(memory)
    .set({ ...entry, updatedAt: new Date() })
    .where(eq(memory.id, id))
    .returning();
  return result;
};

export const deleteMemory = async (id: string) => {
  return db.delete(memory).where(eq(memory.id, id));
};
