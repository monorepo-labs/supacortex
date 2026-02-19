import { NextRequest, NextResponse } from "next/server";
import { pollDeviceCode } from "@/server/device-codes/queries";

export async function POST(req: NextRequest) {
  const { deviceCode } = await req.json();
  if (!deviceCode) {
    return NextResponse.json(
      { error: "deviceCode is required" },
      { status: 400 },
    );
  }

  try {
    const result = await pollDeviceCode(deviceCode);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid device code" },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[device-code] poll failed:", error);
    return NextResponse.json(
      { error: "Failed to poll device code" },
      { status: 500 },
    );
  }
}
