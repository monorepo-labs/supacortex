import { db } from "@/services/db";
import { groups } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const getGroupsForUser = async (userId: string) => {
  return db
    .select()
    .from(groups)
    .where(eq(groups.createdBy, userId))
    .orderBy(asc(groups.createdAt), asc(groups.id));
};
