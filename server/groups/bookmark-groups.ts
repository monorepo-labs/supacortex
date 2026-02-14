import { db } from "@/services/db";
import { bookmarkGroups } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export const addBookmarksToGroups = async (
  bookmarkIds: string[],
  groupIds: string[],
) => {
  const values = bookmarkIds.flatMap((bookmarkId) =>
    groupIds.map((groupId) => ({ bookmarkId, groupId })),
  );
  if (values.length === 0) return;
  return db.insert(bookmarkGroups).values(values).onConflictDoNothing();
};

export const removeBookmarksFromGroups = async (
  bookmarkIds: string[],
  groupIds: string[],
) => {
  if (bookmarkIds.length === 0 || groupIds.length === 0) return;
  return db
    .delete(bookmarkGroups)
    .where(
      and(
        inArray(bookmarkGroups.bookmarkId, bookmarkIds),
        inArray(bookmarkGroups.groupId, groupIds),
      ),
    );
};

export const getGroupIdsForBookmarks = async (bookmarkIds: string[]) => {
  if (bookmarkIds.length === 0) return new Map<string, string[]>();
  const rows = await db
    .select({
      bookmarkId: bookmarkGroups.bookmarkId,
      groupId: bookmarkGroups.groupId,
    })
    .from(bookmarkGroups)
    .where(inArray(bookmarkGroups.bookmarkId, bookmarkIds));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const existing = map.get(row.bookmarkId) ?? [];
    existing.push(row.groupId);
    map.set(row.bookmarkId, existing);
  }
  return map;
};
