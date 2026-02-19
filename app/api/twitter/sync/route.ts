import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/services/auth";
import { getUser } from "@/lib/get-user";

export const maxDuration = 720;

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      },
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
