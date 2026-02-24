import { db } from "@/services/db";
import { bookmarks, bookmarksInsertSchema } from "@/db/schema";
import { eq } from "drizzle-orm";
import z from "zod";

export const createBookmark = async (
  bookmark: z.infer<typeof bookmarksInsertSchema>,
) => {
  const [result] = await db.insert(bookmarks).values(bookmark).returning();
  return result;
};

export const deleteBookmark = async (id: string) => {
  return db.delete(bookmarks).where(eq(bookmarks.id, id));
};


