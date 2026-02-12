import { db } from "@/services/db";
import { bookmarks, bookmarksInsertSchema } from "@/db/schema";
import z from "zod";

export const createBookmark = async (
  bookmark: z.infer<typeof bookmarksInsertSchema>,
) => {
  return db.insert(bookmarks).values(bookmark);
};
