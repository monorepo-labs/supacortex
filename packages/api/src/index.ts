import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { authMiddleware } from "./middleware/auth";
import { bookmarks } from "./routes/bookmarks";
import { groups } from "./routes/groups";
import { Env } from "./types";

const app = new Hono<Env>();

app.get("/health", (c) => {
  return c.json({ message: "Server is healthy" }, { status: 200 });
});

app.use("/v1/*", authMiddleware);
app.route("/v1/bookmarks", bookmarks);
app.route("/v1/groups", groups);

serve(
  {
    fetch: app.fetch,
    port: 3001,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
