import { randomBytes } from "node:crypto";
import { db } from "@/services/db";
import { deviceCodes } from "@/db/schema";
import { eq, lt } from "drizzle-orm";
import { createApiKey } from "@/server/api-keys/mutation";

function generateUserCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
  let code = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export const createDeviceCode = async () => {
  // Clean expired codes first
  await db.delete(deviceCodes).where(lt(deviceCodes.expiresAt, new Date()));

  const deviceCode = randomBytes(32).toString("hex");
  const userCode = generateUserCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.insert(deviceCodes).values({
    deviceCode,
    userCode,
    expiresAt,
  });

  return { deviceCode, userCode, expiresAt };
};

export const approveDeviceCode = async (userCode: string, userId: string) => {
  const [row] = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.userCode, userCode.toUpperCase()));

  if (!row) return { error: "Invalid code" };
  if (row.status !== "pending") return { error: "Code already used" };
  if (row.expiresAt < new Date()) return { error: "Code expired" };

  const rawKey = await createApiKey("CLI (scx login)", userId);

  await db
    .update(deviceCodes)
    .set({ apiKey: rawKey, status: "approved" })
    .where(eq(deviceCodes.id, row.id));

  return { success: true };
};
