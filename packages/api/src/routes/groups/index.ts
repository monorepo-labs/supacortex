import { Hono } from "hono";
import { getGroupsForUser } from "@/server/groups/queries";
import { createGroup, deleteGroup } from "@/server/groups/mutations";
import { Env } from "../../types";

export const groups = new Hono<Env>();

groups.get("/", async (c) => {
  const userId = c.get("userId");

  try {
    const result = await getGroupsForUser(userId);
    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to get groups" }, 400);
  }
});

groups.post("/", async (c) => {
  const userId = c.get("userId");
  const { name, color } = await c.req.json();

  if (!name) return c.json({ error: "Name is required" }, 400);

  try {
    const result = await createGroup({
      name,
      color: color ?? "#6b7280",
      createdBy: userId,
    });
    return c.json(result, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to create group" }, 500);
  }
});

groups.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const groupId = c.req.param("id");

  const allGroups = await getGroupsForUser(userId);
  const exists = allGroups.find((g: any) => g.id === groupId);
  if (!exists) return c.json({ error: "Group not found" }, 404);

  try {
    await deleteGroup(groupId);
    return c.json({ message: "Group deleted" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to delete group" }, 500);
  }
});
