import { db } from "@/services/db";
import { bookmarks, bookmarkGroups } from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export const getBookmarksForUser = async (
  userId: string,
  search?: string,
  groupId?: string,
) => {
  const conditions = [eq(bookmarks.createdBy, userId)];
  let tsQuery;

  if (search) {
    // Split into words, append :* for prefix matching, join with | (OR)
    // ts_rank handles relevance — more term matches = higher score
    const prefixQuery = search
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => `${word}:*`)
      .join(" | ");
    tsQuery = sql`to_tsquery('english', ${prefixQuery})`;
    conditions.push(sql`${bookmarks.searchVector} @@ ${tsQuery}`);
  }

  // When filtering by group, only return bookmarks in that group
  if (groupId) {
    const bookmarkIdsInGroup = db
      .select({ bookmarkId: bookmarkGroups.bookmarkId })
      .from(bookmarkGroups)
      .where(eq(bookmarkGroups.groupId, groupId));
    conditions.push(inArray(bookmarks.id, bookmarkIdsInGroup));
  }

  const order = tsQuery
    ? sql`ts_rank(${bookmarks.searchVector}, ${tsQuery}, 1) DESC`
    : desc(bookmarks.createdAt);

  const rows = await db
    .select()
    .from(bookmarks)
    .where(and(...conditions))
    .orderBy(order);

  // Fetch groupIds for all returned bookmarks
  const bookmarkIds = rows.map((r) => r.id);
  let groupMap = new Map<string, string[]>();
  if (bookmarkIds.length > 0) {
    const groupRows = await db
      .select({
        bookmarkId: bookmarkGroups.bookmarkId,
        groupId: bookmarkGroups.groupId,
      })
      .from(bookmarkGroups)
      .where(inArray(bookmarkGroups.bookmarkId, bookmarkIds));

    for (const row of groupRows) {
      const existing = groupMap.get(row.bookmarkId) ?? [];
      existing.push(row.groupId);
      groupMap.set(row.bookmarkId, existing);
    }
  }

  return rows.map((row) => ({
    ...row,
    groupIds: groupMap.get(row.id) ?? [],
  }));
};
