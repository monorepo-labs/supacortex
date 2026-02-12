import { db } from "@/services/db";
import { bookmarks, bookmarksInsertSchema } from "@/db/schema";
import { eq } from "drizzle-orm";
import z from "zod";

export const createBookmark = async (
  bookmark: z.infer<typeof bookmarksInsertSchema>,
) => {
  return db.insert(bookmarks).values(bookmark);
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
