import { apiKeys, user } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";
import { hashApiKey, updateApiKeyLastUsed } from "./mutation";

export const validateApiKey = async (key: string) => {
  const keyHash = hashApiKey(key);
  const [row] = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash));

  if (!row) return null;

  await updateApiKeyLastUsed(row.id);
  return row;
};

export const getApiKeysForUser = async (userId: string) => {
  return await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));
};
