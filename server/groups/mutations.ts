import { db } from "@/services/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";

export const createGroup = async (group: {
  name: string;
  color: string;
  icon?: string;
  createdBy: string;
}) => {
  const [result] = await db.insert(groups).values(group).returning();
  return result;
};

export const renameGroup = async (id: string, name: string) => {
  return db.update(groups).set({ name }).where(eq(groups.id, id));
};

export const updateGroup = async (
  id: string,
  data: { name?: string; color?: string; icon?: string },
) => {
  return db.update(groups).set(data).where(eq(groups.id, id));
};

export const deleteGroup = async (id: string) => {
  return db.delete(groups).where(eq(groups.id, id));
};
