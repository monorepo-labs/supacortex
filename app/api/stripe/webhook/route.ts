import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  createPaymentRecord,
  completePayment,
  failPayment,
} from "@/server/payments/mutations";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    // Upsert: create record if checkout route didn't persist it (crash between Stripe call and DB insert)
    if (userId) {
      await createPaymentRecord({
        userId,
        stripeSessionId: session.id,
        amount: session.amount_total ?? 1000,
      }).catch(() => {
        // Record already exists (unique constraint on stripeSessionId) — expected path
      });
    }
    await completePayment(
      session.id,
      (session.payment_intent as string) ?? "",
    );
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    await failPayment(session.id);
  }

  return NextResponse.json({ received: true });
}
