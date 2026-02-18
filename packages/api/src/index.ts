import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { authMiddleware } from "./middleware/auth";
import { bookmarks } from "./routes/bookmarks";
import { groups } from "./routes/groups";
import { sync } from "./routes/sync";
import { getAllResumableSyncs, resumeSync } from "@/server/twitter/resume";
import { autoCategorizeSync } from "@/server/twitter/categorize";
import { Env } from "./types";

const app = new Hono<Env>();

app.get("/health", (c) => {
  return c.json({ message: "Server is healthy" }, { status: 200 });
});

// Cron endpoint — resume interrupted syncs (before auth middleware)
app.post("/internal/sync/resume-all", async (c) => {
  const cronSecret = c.req.header("X-Cron-Secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const resumable = await getAllResumableSyncs();
  console.log(`[cron:resume] found ${resumable.length} interrupted syncs to resume`);

  const results = [];
  for (const sync of resumable) {
    try {
      const result = await resumeSync(sync.userId);

      // Fire-and-forget categorization if completed
      if (result.status === "completed" && result.insertedBookmarks.length > 0) {
        autoCategorizeSync(sync.userId, result.insertedBookmarks).catch((err) => {
          console.error("[cron:categorize] failed (non-blocking):", err);
        });
      }

      results.push({ userId: sync.userId, status: result.status, synced: result.synced });
    } catch (err) {
      console.error(`[cron:resume] failed for user=${sync.userId}:`, err);
      results.push({ userId: sync.userId, error: (err as Error).message });
    }
  }

  return c.json({ resumed: results.length, results });
});

app.use("/v1/*", authMiddleware);
app.route("/v1/bookmarks", bookmarks);
app.route("/v1/groups", groups);
app.route("/v1/sync", sync);

serve(
  {
    fetch: app.fetch,
    port: 3001,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
