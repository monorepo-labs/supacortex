import { NextResponse } from "next/server";
import { getUser } from "@/lib/get-user";

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(`${API_URL}/v1/sync/status`, {
      headers: {
        "X-Internal-Token": INTERNAL_API_SECRET ?? "",
        "X-User-Id": user.id,
      },
    });

    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ status: "none" });
  }
}
