import { Hono } from "hono";
import { getMemoryForUser } from "@/server/memory/queries";
import { createMemory, updateMemory, deleteMemory } from "@/server/memory/mutations";
import { Env } from "../../types";

export const memoryRoute = new Hono<Env>();

// GET /v1/memory?search=&type=&limit=&offset=
memoryRoute.get("/", async (c) => {
  const userId = c.get("userId");
  const search = c.req.query("search");
  const type = c.req.query("type");
  const limit = parseInt(c.req.query("limit") ?? "100");
  const offset = parseInt(c.req.query("offset") ?? "0");

  try {
    const { data, count } = await getMemoryForUser(userId, search, type, limit, offset);
    return c.json({ data, meta: { count, limit, offset } });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to get memory" }, 400);
  }
});

// POST /v1/memory
memoryRoute.post("/", async (c) => {
  const userId = c.get("userId");
  const { title, content, type, metadata } = await c.req.json();

  if (!type) return c.json({ error: "type is required" }, 400);
  if (!content) return c.json({ error: "content is required" }, 400);

  try {
    const result = await createMemory({ title, content, type, metadata, createdBy: userId });
    return c.json(result, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to create memory" }, 500);
  }
});

// PATCH /v1/memory/:id
memoryRoute.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { title, content, type, metadata } = await c.req.json();

  try {
    const result = await updateMemory(id, userId, { title, content, type, metadata });
    if (!result) return c.json({ error: "Memory not found" }, 404);
    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to update memory" }, 500);
  }
});

// DELETE /v1/memory/:id
memoryRoute.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  try {
    await deleteMemory(id, userId);
    return c.json({ message: "Memory deleted" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to delete memory" }, 500);
  }
});
