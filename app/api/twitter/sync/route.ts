import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/services/auth";
import { getUser } from "@/lib/get-user";
import { hasUserPaidForSync } from "@/server/payments/queries";

export const maxDuration = 720;

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasPaid = await hasUserPaidForSync(user.id);
  if (!hasPaid)
    return NextResponse.json(
      { error: "Payment required to sync bookmarks" },
      { status: 402 },
    );

  // Read optional sinceYear from request body
  let sinceYear: number | undefined;
  try {
    const body = await request.json();
    if (body?.sinceYear != null) sinceYear = Number(body.sinceYear);
  } catch {
    // No body — sinceYear stays undefined
  }

  // Refresh X access token via BetterAuth (ensures token is fresh before sync)
  try {
    await auth.api.getAccessToken({
      body: { providerId: "twitter" },
      headers: await headers(),
    });
  } catch {
    // Non-blocking — the Hono server reads the token directly from DB
  }

  // Proxy to Hono server
  try {
    const res = await fetch(`${API_URL}/v1/sync`, {
      method: "POST",
      headers: {
        "X-Internal-Token": INTERNAL_API_SECRET ?? "",
        "X-User-Id": user.id,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sinceYear: sinceYear ?? null }),
    });

    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Sync service unavailable" },
      { status: 503 },
    );
  }
}
