import { db } from "@/services/db";
import { bookmarks } from "@/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";

export const getBookmarksForUser = async (userId: string, search?: string) => {
  const conditions = [eq(bookmarks.createdBy, userId)];

  if (search) {
    conditions.push(
      or(
        ilike(bookmarks.title, `%${search}%`),
        ilike(bookmarks.content, `%${search}%`),
        ilike(bookmarks.aiTitle, `%${search}%`),
        ilike(bookmarks.author, `%${search}%`),
      )!,
    );
  }

  return db
    .select()
    .from(bookmarks)
    .where(and(...conditions));
};
