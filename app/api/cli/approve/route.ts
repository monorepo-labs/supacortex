import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/get-user";
import { approveDeviceCode } from "@/server/device-codes/mutations";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { userCode } = await req.json();
  if (!userCode) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const result = await approveDeviceCode(userCode, user.id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
