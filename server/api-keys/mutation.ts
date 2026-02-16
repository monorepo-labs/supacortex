// generate, hash, create, delete
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/services/db";
import { apiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const generateAPIKey = (): string => {
  return `scx_${randomBytes(16).toString("hex")}`;
};

export const hashApiKey = (key: string): string => {
  return createHash("sha256").update(key).digest("hex");
};

export const createApiKey = async (
  name: string,
  userId: string,
): Promise<string> => {
  const rawKey = generateAPIKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);
  await db.insert(apiKeys).values({
    name,
    userId,
    keyHash,
    keyPrefix,
  });
  return rawKey;
};

export const updateApiKeyLastUsed = async (id: string) => {
  return await db
    .update(apiKeys)
    .set({
      lastUsedAt: new Date(),
    })
    .where(eq(apiKeys.id, id));
};

export const deleteApiKey = async (id: string, userId: string) => {
  return await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
};
