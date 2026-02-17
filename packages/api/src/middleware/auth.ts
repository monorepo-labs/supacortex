import { createMiddleware } from "hono/factory";
import { validateApiKey } from "@/server/api-keys/queries";

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return c.json({ error: "Invalid Api Key" }, 401);

  const key = authHeader.split(" ")[1];

  const result = await validateApiKey(key);
  if (result == null) return c.json({ error: "Authentication Failed" }, 401);
  c.set("userId", result.userId);

  await next();
});
