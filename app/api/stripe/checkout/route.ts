import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getUser } from "@/lib/get-user";
import { createPaymentRecord } from "@/server/payments/mutations";
import { hasUserPaidForSync } from "@/server/payments/queries";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alreadyPaid = await hasUserPaidForSync(user.id);
  if (alreadyPaid)
    return NextResponse.json({ error: "Already paid" }, { status: 400 });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app`,
    customer_email: user.email,
    metadata: {
      userId: user.id,
      productType: "twitter_sync",
    },
  });

  await createPaymentRecord({
    userId: user.id,
    stripeSessionId: session.id,
    amount: session.amount_total ?? 1000,
  });

  return NextResponse.json({ url: session.url });
}
