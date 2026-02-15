type UrlTypes = "tweet" | "link" | "pdf" | "youtube";

const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export const classifyUrlType = (url: string): UrlTypes => {
  const { hostname, pathname } = new URL(url);
  if (hostname === "x.com" || hostname === "twitter.com") {
    return "tweet";
  } else if (YOUTUBE_HOSTNAMES.has(hostname)) {
    return "youtube";
  } else if (pathname.includes("pdf")) {
    return "pdf";
  } else return "link";
};
