import { eq, and } from "drizzle-orm";
import { db } from "@/services/db";
import { account } from "@/db/schema";

type XAccessToken = {
  accessToken: string;
  xUserId: string;
};

export async function getXAccessToken(userId: string): Promise<XAccessToken | null> {
  const [xAccount] = await db
    .select({
      accountId: account.accountId,
      accessToken: account.accessToken,
      accessTokenExpiresAt: account.accessTokenExpiresAt,
    })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "twitter")))
    .limit(1);

  if (!xAccount || !xAccount.accessToken) return null;

  // If expired, user needs to re-auth from the dashboard
  if (xAccount.accessTokenExpiresAt && xAccount.accessTokenExpiresAt < new Date()) {
    console.log(`[access-token] X token expired for user=${userId}`);
    return null;
  }

  return {
    accessToken: xAccount.accessToken,
    xUserId: xAccount.accountId,
  };
}
