import { db } from "@/services/db";
import { bookmarks, bookmarksInsertSchema } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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

export const updateBookmarkPosition = async (
  id: string,
  positionX: number,
  positionY: number,
) => {
  return db
    .update(bookmarks)
    .set({ positionX, positionY })
    .where(eq(bookmarks.id, id));
};

export const updateGridLayout = async (
  items: { id: string; gridX: number; gridY: number; gridW: number; gridH: number }[],
) => {
  if (items.length === 0) return;
  const queries = items.map((item) =>
    db
      .update(bookmarks)
      .set({ gridX: item.gridX, gridY: item.gridY, gridW: item.gridW, gridH: item.gridH })
      .where(eq(bookmarks.id, item.id)),
  );
  await Promise.all(queries);
};
