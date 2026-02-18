import { createMiddleware } from "hono/factory";
import { validateApiKey } from "@/server/api-keys/queries";

export const authMiddleware = createMiddleware(async (c, next) => {
  // Internal auth: trusted calls from Next.js proxy
  const internalToken = c.req.header("X-Internal-Token");
  const internalUserId = c.req.header("X-User-Id");
  if (internalToken && internalUserId) {
    const secret = process.env.INTERNAL_API_SECRET;
    if (secret && internalToken === secret) {
      c.set("userId", internalUserId);
      return next();
    }
    return c.json({ error: "Invalid internal token" }, 401);
  }

  // API key auth
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return c.json({ error: "Invalid Api Key" }, 401);

  const key = authHeader.split(" ")[1];

  const result = await validateApiKey(key);
  if (result == null) return c.json({ error: "Authentication Failed" }, 401);
  c.set("userId", result.userId);

  await next();
});
