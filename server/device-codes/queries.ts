import { db } from "@/services/db";
import { deviceCodes } from "@/db/schema";
import { eq } from "drizzle-orm";

export const pollDeviceCode = async (deviceCode: string) => {
  const [row] = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.deviceCode, deviceCode));

  if (!row) return null;
  if (row.expiresAt < new Date()) return { status: "expired" as const };

  if (row.status === "approved" && row.apiKey) {
    return { status: "approved" as const, apiKey: row.apiKey };
  }

  return { status: "pending" as const };
};
