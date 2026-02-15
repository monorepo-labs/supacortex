import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = ["video.twimg.com", "pbs.twimg.com"];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const { hostname } = new URL(url);
    if (!ALLOWED_HOSTS.includes(hostname)) {
      return new NextResponse("Forbidden host", { status: 403 });
    }
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  const res = await fetch(url);
  if (!res.ok) return new NextResponse("Upstream error", { status: res.status });

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "video/mp4",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
