import { db } from "@/services/db";
import { memory } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const getMemoryForUser = async (
  userId: string,
  searchQuery?: string,
  type?: string,
  limit?: number,
  offset?: number,
) => {
  const conditions = [eq(memory.createdBy, userId)];
  if (type) {
    conditions.push(eq(memory.type, type));
  }
  let tsQuery;

  if (searchQuery) {
    const prefixQuery = searchQuery
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(Boolean)
      .map((word) => `${word}:*`)
      .join("|");

    tsQuery = sql`to_tsquery('english', ${prefixQuery})`;
    conditions.push(sql`${memory.searchVector} @@ ${tsQuery}`);
  }

  const where = and(...conditions);

  const order = tsQuery
    ? sql`ts_rank_cd(${memory.searchVector}, ${tsQuery}, 32) DESC`
    : desc(memory.createdAt);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memory)
    .where(where);

  let query = db
    .select()
    .from(memory)
    .where(where)
    .orderBy(order)
    .$dynamic();

  if (limit !== undefined) query = query.limit(limit);
  if (offset !== undefined) query = query.offset(offset);

  const data = await query;

  return { data, count };
};
