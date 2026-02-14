import { db } from "@/services/db";
import { bookmarks } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const getBookmarksForUser = async (userId: string, search?: string) => {
  const conditions = [eq(bookmarks.createdBy, userId)];
  let query;
  if (search) {
    query = sql`plainto_tsquery('english', ${search})`;
    conditions.push(sql`${bookmarks.searchVector} @@ ${query}`);
  }

  const order = query
    ? sql`ts_rank(${bookmarks.searchVector}, ${query}, 1) DESC`
    : desc(bookmarks.createdAt);

  return db
    .select()
    .from(bookmarks)
    .where(and(...conditions))
    .orderBy(order);
};
