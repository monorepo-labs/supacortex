import { db } from "@/services/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function createPaymentRecord({
  userId,
  stripeSessionId,
  amount,
  currency = "usd",
  productType = "twitter_sync",
}: {
  userId: string;
  stripeSessionId: string;
  amount: number;
  currency?: string;
  productType?: string;
}) {
  const [record] = await db
    .insert(payments)
    .values({
      userId,
      stripeSessionId,
      amount,
      currency,
      productType,
      status: "pending",
    })
    .returning();

  return record;
}

export async function completePayment(
  stripeSessionId: string,
  stripePaymentIntentId: string,
) {
  await db
    .update(payments)
    .set({
      status: "completed",
      stripePaymentIntentId,
    })
    .where(eq(payments.stripeSessionId, stripeSessionId));
}

export async function failPayment(stripeSessionId: string) {
  await db
    .update(payments)
    .set({ status: "failed" })
    .where(eq(payments.stripeSessionId, stripeSessionId));
}
