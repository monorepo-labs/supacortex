import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/services/auth";
import { db } from "@/services/db";
import { account } from "@/db/schema";
import { getUser } from "@/lib/get-user";
import { syncTwitterBookmarks } from "@/server/twitter/sync";

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

  try {
    const result = await syncTwitterBookmarks(
      user.id,
      tokenResult.accessToken,
      xAccount.accountId,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to sync X bookmarks" },
      { status: 500 },
    );
  }
}
