import { db } from "@/services/db";
import { tags } from "@/db/schema";
import { eq } from "drizzle-orm";

export const createTag = async (tag: {
  name: string;
  color: string;
  createdBy: string;
}) => {
  const [result] = await db.insert(tags).values(tag).returning();
  return result;
};

export const renameTag = async (id: string, name: string) => {
  return db.update(tags).set({ name }).where(eq(tags.id, id));
};

export const updateTag = async (
  id: string,
  data: { name?: string; color?: string; icon?: string },
) => {
  return db.update(tags).set(data).where(eq(tags.id, id));
};
