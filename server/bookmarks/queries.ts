import { db } from "@/services/db";
import { bookmarks, bookmarkGroups } from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export type BookmarkEdge = {
  source: string;
  target: string;
  shared: number;
  terms: string[];
};

export type GraphData = {
  edges: BookmarkEdge[];
};

export const getBookmarkGraph = async (
  userId: string,
  minShared = 3,
): Promise<GraphData> => {
  const result = await db.execute(sql`
    WITH terms AS (
      SELECT id, unnest(tsvector_to_array(search_vector)) AS term
      FROM bookmarks
      WHERE created_by = ${userId}
        AND search_vector IS NOT NULL
    ),
    term_counts AS (
      SELECT term, COUNT(*) AS doc_count
      FROM terms
      GROUP BY term
    ),
    total AS (
      SELECT COUNT(DISTINCT id) AS n FROM terms
    ),
    filtered AS (
      SELECT t.id, t.term
      FROM terms t
      JOIN term_counts tc ON tc.term = t.term
      CROSS JOIN total
      WHERE length(t.term) > 2
        AND tc.doc_count::float / total.n <= 0.3
    ),
    pairs AS (
      SELECT
        a.id AS source,
        b.id AS target,
        COUNT(*) AS shared,
        array_agg(a.term ORDER BY length(a.term) DESC) AS terms
      FROM filtered a
      JOIN filtered b ON a.term = b.term AND a.id < b.id
      GROUP BY a.id, b.id
      HAVING COUNT(*) >= ${minShared}
    )
    SELECT json_build_object(
      'edges', (
        SELECT coalesce(json_agg(
          json_build_object('source', source, 'target', target, 'shared', shared::int, 'terms', terms)
          ORDER BY shared DESC
        ), '[]'::json)
        FROM pairs
      )
    ) AS data
  `);

  const row = (result as unknown as { data: GraphData }[])[0];
  return row?.data ?? { edges: [] };
};

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
    ? sql`ts_rank_cd(${bookmarks.searchVector}, ${tsQuery}, 32) DESC`
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
