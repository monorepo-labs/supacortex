import { Hono } from "hono";
import { getXAccessToken } from "@/server/twitter/access-token";
import { syncTwitterBookmarks, SyncInProgressError, RateLimitError, CreditsDepletedError } from "@/server/twitter/sync";
import { autoCategorizeSync } from "@/server/twitter/categorize";
import { getInterruptedSync } from "@/server/twitter/resume";
import { db } from "@/services/db";
import { syncLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Env } from "../../types";

export const sync = new Hono<Env>();

// POST /v1/sync — trigger a new sync
sync.post("/", async (c) => {
  const userId = c.get("userId");

  const token = await getXAccessToken(userId);
  if (!token) {
    return c.json(
      { error: "X access token expired or not found. Please reconnect your X account." },
      400,
    );
  }

  try {
    const result = await syncTwitterBookmarks(userId, token.accessToken, token.xUserId);

    // Fire-and-forget categorization if sync completed (not interrupted)
    if (result.status === "completed" && result.insertedBookmarks.length > 0) {
      autoCategorizeSync(userId, result.insertedBookmarks).catch((err) => {
        console.error("[sync:categorize] failed (non-blocking):", err);
      });
    }

    return c.json({
      synced: result.synced,
      status: result.status,
      rateLimitResetsAt: result.rateLimitResetsAt?.toISOString() ?? null,
      apiCalls: result.apiCalls,
      tweetsTotal: result.tweetsTotal,
      durationMs: result.durationMs,
      mode: result.mode,
      syncLogId: result.syncLogId,
    });
  } catch (err) {
    if (err instanceof SyncInProgressError) {
      return c.json({ error: err.message }, 409);
    }
    if (err instanceof RateLimitError) {
      return c.json({
        error: err.message,
        rateLimitResetsAt: err.resetAt?.toISOString() ?? null,
      }, 429);
    }
    console.error("[sync] error:", err);
    return c.json({ error: "Failed to sync X bookmarks" }, 500);
  }
});

// GET /v1/sync/status — check latest sync status
sync.get("/status", async (c) => {
  const userId = c.get("userId");

  // Check for interrupted sync first
  const interrupted = await getInterruptedSync(userId);
  if (interrupted) {
    return c.json({
      status: "interrupted",
      rateLimitResetsAt: interrupted.rateLimitResetsAt?.toISOString() ?? null,
      syncLogId: interrupted.id,
    });
  }

  // Get latest syncLog
  const [latest] = await db
    .select({
      id: syncLogs.id,
      status: syncLogs.status,
      tweetsSynced: syncLogs.tweetsSynced,
      tweetsTotal: syncLogs.tweetsTotal,
      apiCalls: syncLogs.apiCalls,
      mode: syncLogs.mode,
      createdAt: syncLogs.createdAt,
    })
    .from(syncLogs)
    .where(eq(syncLogs.userId, userId))
    .orderBy(desc(syncLogs.createdAt))
    .limit(1);

  if (!latest) {
    return c.json({ status: "none" });
  }

  return c.json({
    status: latest.status,
    tweetsSynced: latest.tweetsSynced,
    tweetsTotal: latest.tweetsTotal,
    apiCalls: latest.apiCalls,
    mode: latest.mode,
    syncLogId: latest.id,
    createdAt: latest.createdAt?.toISOString() ?? null,
  });
});
