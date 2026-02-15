import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/services/auth";
import { db } from "@/services/db";
import { account, syncLogs } from "@/db/schema";
import { getUser } from "@/lib/get-user";
import { syncTwitterBookmarks, RateLimitError, type SyncResult } from "@/server/twitter/sync";

export const maxDuration = 720;

export async function POST() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the X account to find the X user ID
  const [xAccount] = await db
    .select({ accountId: account.accountId })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "twitter")))
    .limit(1);

  if (!xAccount)
    return NextResponse.json(
      { error: "X account not connected. Please link your X account first." },
      { status: 400 },
    );

  // Get a fresh access token (BetterAuth auto-refreshes if expired)
  const tokenResult = await auth.api.getAccessToken({
    body: { providerId: "twitter" },
    headers: await headers(),
  });

  if (!tokenResult?.accessToken)
    return NextResponse.json(
      {
        error: "Failed to get X access token. Try reconnecting your X account.",
      },
      { status: 400 },
    );

  const logUsage = async (result: SyncResult) => {
    try {
      await db.insert(syncLogs).values({
        userId: user.id,
        mode: result.mode,
        tweetsTotal: result.tweetsTotal,
        tweetsSynced: result.synced,
        apiCalls: result.apiCalls,
        cost: result.tweetsTotal * 0.005,
        rateLimited: result.rateLimited,
        durationMs: result.durationMs,
      });
    } catch (e) {
      console.error("[sync] failed to log usage", e);
    }
  };

  try {
    const result = await syncTwitterBookmarks(
      user.id,
      tokenResult.accessToken,
      xAccount.accountId,
    );
    await logUsage(result);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 },
      );
    }
    console.log(error);
    return NextResponse.json(
      { error: "Failed to sync X bookmarks" },
      { status: 500 },
    );
  }
}
