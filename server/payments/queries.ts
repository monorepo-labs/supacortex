import { db } from "@/services/db";
import { payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function hasUserPaidForSync(userId: string): Promise<boolean> {
  const result = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.productType, "twitter_sync"),
        eq(payments.status, "completed"),
      ),
    )
    .limit(1);

  return result.length > 0;
}
