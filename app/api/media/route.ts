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

  // Forward Range header from client (WKWebView/Tauri needs range requests for video)
  const headers: Record<string, string> = {};
  const range = req.headers.get("Range");
  if (range) headers["Range"] = range;

  const res = await fetch(url, { headers });
  if (!res.ok && res.status !== 206)
    return new NextResponse("Upstream error", { status: res.status });

  const contentType = res.headers.get("Content-Type") ?? "video/mp4";
  const contentLength = res.headers.get("Content-Length");
  const contentRange = res.headers.get("Content-Range");
  const acceptRanges = res.headers.get("Accept-Ranges");

  const responseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400, immutable",
    "Accept-Ranges": acceptRanges ?? "bytes",
  };

  if (contentLength) responseHeaders["Content-Length"] = contentLength;
  if (contentRange) responseHeaders["Content-Range"] = contentRange;

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
