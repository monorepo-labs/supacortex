import { db } from "@/services/db";
import { tags } from "@/db/schema";
import { eq } from "drizzle-orm";

export const getTagsForUser = async (userId: string) => {
  return await db.select().from(tags).where(eq(tags.createdBy, userId));
};
