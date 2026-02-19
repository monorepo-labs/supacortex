import { NextResponse } from "next/server";
import { createDeviceCode } from "@/server/device-codes/mutations";

const VERIFY_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/auth/verify"
    : "https://supacortex.ai/auth/verify";

export async function POST() {
  try {
    const { deviceCode, userCode, expiresAt } = await createDeviceCode();
    return NextResponse.json({
      deviceCode,
      userCode,
      expiresAt: expiresAt.toISOString(),
      verifyUrl: VERIFY_URL,
    });
  } catch (error) {
    console.error("[device-code] create failed:", error);
    return NextResponse.json(
      { error: "Failed to create device code" },
      { status: 500 },
    );
  }
}
