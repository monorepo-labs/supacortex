import { eq, and, lte } from "drizzle-orm";
import { db } from "@/services/db";
import { syncLogs } from "@/db/schema";
import { getXAccessToken } from "./access-token";
import { syncTwitterBookmarks } from "./sync";
import { desc } from "drizzle-orm";

type InterruptedSync = {
  id: string;
  userId: string;
  paginationToken: string;
  rateLimitResetsAt: Date | null;
  mode: string;
  sinceYear: number | null;
};

export async function getInterruptedSync(userId: string): Promise<InterruptedSync | null> {
  const [log] = await db
    .select({
      id: syncLogs.id,
      userId: syncLogs.userId,
      paginationToken: syncLogs.paginationToken,
      rateLimitResetsAt: syncLogs.rateLimitResetsAt,
      mode: syncLogs.mode,
      sinceYear: syncLogs.sinceYear,
    })
    .from(syncLogs)
    .where(and(eq(syncLogs.userId, userId), eq(syncLogs.status, "interrupted")))
    .orderBy(desc(syncLogs.createdAt))
    .limit(1);

  if (!log || !log.paginationToken) return null;

  return log as InterruptedSync;
}

export async function getAllResumableSyncs(): Promise<InterruptedSync[]> {
  const logs = await db
    .select({
      id: syncLogs.id,
      userId: syncLogs.userId,
      paginationToken: syncLogs.paginationToken,
      rateLimitResetsAt: syncLogs.rateLimitResetsAt,
      mode: syncLogs.mode,
      sinceYear: syncLogs.sinceYear,
    })
    .from(syncLogs)
    .where(
      and(
        eq(syncLogs.status, "interrupted"),
        lte(syncLogs.rateLimitResetsAt, new Date()),
      ),
    );

  return logs.filter((l) => l.paginationToken) as InterruptedSync[];
}

export async function resumeSync(userId: string) {
  const interrupted = await getInterruptedSync(userId);
  if (!interrupted) {
    throw new Error("No interrupted sync to resume");
  }

  // Check rate limit has reset
  if (interrupted.rateLimitResetsAt && interrupted.rateLimitResetsAt > new Date()) {
    throw new Error(`Rate limit hasn't reset yet. Resets at ${interrupted.rateLimitResetsAt.toISOString()}`);
  }

  const token = await getXAccessToken(userId);
  if (!token) {
    throw new Error("X access token expired or not found. User needs to re-auth.");
  }

  // Mark old interrupted log as completed before starting resume
  await db.update(syncLogs).set({ status: "completed" }).where(eq(syncLogs.id, interrupted.id));

  return syncTwitterBookmarks(userId, token.accessToken, token.xUserId, {
    resumeToken: interrupted.paginationToken,
    resumeMode: interrupted.mode as "initial" | "incremental",
    sinceYear: interrupted.sinceYear ?? undefined,
  });
}
