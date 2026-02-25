import { NextResponse } from "next/server";
import { getUser } from "@/lib/get-user";
import { hasUserPaidForSync } from "@/server/payments/queries";

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasPaid = await hasUserPaidForSync(user.id);
  return NextResponse.json({ hasPaid });
}
