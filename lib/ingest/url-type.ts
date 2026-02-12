type UrlTypes = "tweet" | "link" | "pdf";

export const classifyUrlType = (url: string): UrlTypes => {
  const { hostname, pathname } = new URL(url);
  if (hostname === "x.com" || hostname === "twitter.com") {
    return "tweet";
  } else if (pathname.includes("pdf")) {
    return "pdf";
  } else return "link";
};
