import { db } from "@/services/db";
import { bookmarks, bookmarkGroups } from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export type BookmarkEdge = {
  source: string;
  target: string;
  shared: number;
  terms: string[];
};

export type GraphNode = {
  id: string;
  title: string | null;
  url: string;
  type: string;
  author: string | null;
  content: string | null;
  mediaUrls: unknown[] | null;
  groupIds: string[];
  isRead: boolean;
  tweetCreatedAt: string | null;
  createdAt: string | null;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: BookmarkEdge[];
};

export const getGraphBookmarks = async (
  userId: string,
  minShared = 3,
  type?: string,
): Promise<GraphData> => {
  const typeCondition = type ? sql`AND type = ${type}` : sql``;

  const result = await db.execute(sql`
    WITH all_bookmarks AS (
      SELECT b.id, b.title, b.url, b.type, b.author, b.content, b.media_urls,
        b.is_read, b.tweet_created_at, b.created_at,
        coalesce(array_agg(bg.group_id) filter (where bg.group_id is not null), '{}') as group_ids
      FROM bookmarks b
      LEFT JOIN bookmark_groups bg ON b.id = bg.bookmark_id
      WHERE b.created_by = ${userId} ${typeCondition}
      GROUP BY b.id
      ORDER BY coalesce(b.tweet_created_at, b.created_at) DESC
      LIMIT 100
    ),
    terms AS (
      SELECT b.id, unnest(tsvector_to_array(bk.search_vector)) AS term
      FROM all_bookmarks b
      JOIN bookmarks bk ON b.id = bk.id
      WHERE bk.search_vector IS NOT NULL
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
      'nodes', (
        SELECT coalesce(json_agg(
          json_build_object(
            'id', id, 'title', title, 'url', url, 'type', type,
            'author', author, 'content', content, 'mediaUrls', media_urls, 'groupIds', group_ids,
            'isRead', is_read, 'tweetCreatedAt', tweet_created_at, 'createdAt', created_at
          )
        ), '[]'::json)
        FROM all_bookmarks
      ),
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
  return row?.data ?? { nodes: [], edges: [] };
};

export const getBookmarksForUser = async (
  userId: string,
  search?: string,
  groupId?: string,
  limit?: number,
  offset?: number,
  type?: string,
) => {
  const conditions = [eq(bookmarks.createdBy, userId)];
  let tsQuery;

  if (type) {
    conditions.push(eq(bookmarks.type, type));
  }

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
    : desc(sql`coalesce(${bookmarks.tweetCreatedAt}, ${bookmarks.createdAt})`);

  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${bookmarks.id})` })
    .from(bookmarks)
    .leftJoin(bookmarkGroups, eq(bookmarks.id, bookmarkGroups.bookmarkId))
    .where(and(...conditions));

  let query = db
    .select({
      id: bookmarks.id,
      type: bookmarks.type,
      title: bookmarks.title,
      url: bookmarks.url,
      content: bookmarks.content,
      author: bookmarks.author,
      mediaUrls: bookmarks.mediaUrls,
      isRead: bookmarks.isRead,
      tweetCreatedAt: bookmarks.tweetCreatedAt,
      createdAt: bookmarks.createdAt,
      createdBy: bookmarks.createdBy,
      groupIds: sql<
        string[]
      >`coalesce(array_agg(${bookmarkGroups.groupId}) filter (where ${bookmarkGroups.groupId} is not null), '{}')`,
    })
    .from(bookmarks)
    .leftJoin(bookmarkGroups, eq(bookmarks.id, bookmarkGroups.bookmarkId))
    .where(and(...conditions))
    .groupBy(bookmarks.id)
    .orderBy(order)
    .$dynamic();

  if (limit !== undefined) query = query.limit(limit);
  if (offset !== undefined) query = query.offset(offset);

  const rows = await query;

  return { data: rows, total: count };
};

export const getBookmarkById = async (bookmarkId: string, userId: string) => {
  const [result] = await db
    .select({
      id: bookmarks.id,
      type: bookmarks.type,
      title: bookmarks.title,
      url: bookmarks.url,
      content: bookmarks.content,
      author: bookmarks.author,
      mediaUrls: bookmarks.mediaUrls,
      isRead: bookmarks.isRead,
      tweetCreatedAt: bookmarks.tweetCreatedAt,
      createdAt: bookmarks.createdAt,
      groupIds: sql<
        string[]
      >`coalesce(array_agg(${bookmarkGroups.groupId}) filter (where ${bookmarkGroups.groupId} is not null), '{}')`,
    })
    .from(bookmarks)
    .leftJoin(bookmarkGroups, eq(bookmarks.id, bookmarkGroups.bookmarkId))
    .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.createdBy, userId)))
    .groupBy(bookmarks.id);
  return result;
};

export const getBookmarksForAPI = async (
  userId: string,
  search?: string,
  groupId?: string,
  limit?: number,
  offset?: number,
  type?: string,
) => {
  const conditions = [eq(bookmarks.createdBy, userId)];
  let tsQuery;

  if (type) {
    conditions.push(eq(bookmarks.type, type));
  }

  if (search) {
    const prefixQuery = search
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => `${word}:*`)
      .join(" | ");
    tsQuery = sql`to_tsquery('english', ${prefixQuery})`;
    conditions.push(sql`${bookmarks.searchVector} @@ ${tsQuery}`);
  }

  if (groupId) {
    const bookmarkIdsInGroup = db
      .select({ bookmarkId: bookmarkGroups.bookmarkId })
      .from(bookmarkGroups)
      .where(eq(bookmarkGroups.groupId, groupId));
    conditions.push(inArray(bookmarks.id, bookmarkIdsInGroup));
  }

  const order = tsQuery
    ? sql`ts_rank_cd(${bookmarks.searchVector}, ${tsQuery}, 32) DESC`
    : desc(sql`coalesce(${bookmarks.tweetCreatedAt}, ${bookmarks.createdAt})`);

  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${bookmarks.id})` })
    .from(bookmarks)
    .leftJoin(bookmarkGroups, eq(bookmarks.id, bookmarkGroups.bookmarkId))
    .where(and(...conditions));

  let query = db
    .select({
      id: bookmarks.id,
      type: bookmarks.type,
      title: bookmarks.title,
      url: bookmarks.url,
      content: bookmarks.content,
      author: bookmarks.author,
      isRead: bookmarks.isRead,
      tweetCreatedAt: bookmarks.tweetCreatedAt,
      createdAt: bookmarks.createdAt,
      groupIds: sql<
        string[]
      >`coalesce(array_agg(${bookmarkGroups.groupId}) filter (where ${bookmarkGroups.groupId} is not null), '{}')`,
    })
    .from(bookmarks)
    .leftJoin(bookmarkGroups, eq(bookmarks.id, bookmarkGroups.bookmarkId))
    .where(and(...conditions))
    .groupBy(bookmarks.id)
    .orderBy(order)
    .$dynamic();

  if (limit !== undefined) query = query.limit(limit);
  if (offset !== undefined) query = query.offset(offset);

  const rows = await query;

  return { data: rows, total: count };
};
