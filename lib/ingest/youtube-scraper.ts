type YouTubeResult = {
  title: string;
  author: string;
  thumbnailUrl: string;
  transcript: string | null;
  videoUrl: string;
};

function extractVideoId(url: string): string | null {
  const parsed = new URL(url);

  // youtu.be/VIDEO_ID
  if (parsed.hostname === "youtu.be" || parsed.hostname === "www.youtu.be") {
    return parsed.pathname.slice(1) || null;
  }

  // youtube.com/watch?v=VIDEO_ID
  const v = parsed.searchParams.get("v");
  if (v) return v;

  // youtube.com/shorts/VIDEO_ID or youtube.com/embed/VIDEO_ID
  const match = parsed.pathname.match(/\/(shorts|embed)\/([^/?]+)/);
  if (match) return match[2];

  return null;
}

/**
 * Fetch caption tracks via YouTube's Android innertube player API.
 * This bypasses browser-only restrictions that block server-side requests.
 * Inspired by github.com/steipete/summarize
 */
async function fetchTranscript(videoId: string): Promise<string | null> {
  // Call the player endpoint with Android client context (no API key or auth needed)
  const playerRes = await fetch(
    "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      },
      body: JSON.stringify({
        context: {
          client: { clientName: "ANDROID", clientVersion: "20.10.38" },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      }),
    },
  );

  if (!playerRes.ok) return null;

  const player = await playerRes.json();
  const tracks =
    player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks?.length) return null;

  // Prefer English, fall back to first available track
  const track = tracks.find(
    (t: { languageCode: string }) => t.languageCode === "en",
  ) || tracks[0];

  const captionRes = await fetch(track.baseUrl);
  if (!captionRes.ok) return null;

  const body = await captionRes.text();
  if (!body) return null;

  // Parse XML format: <p> tags with <s> segments inside
  // e.g. <p t="2960" d="5280"><s ac="0">Maybe</s><s t="240"> you</s></p>
  const segments = [...body.matchAll(/<p[^>]*>([^]*?)<\/p>/g)]
    .map((m) => {
      // Extract text from <s> tags within each <p>
      const segs = [...m[1].matchAll(/<s[^>]*>([^<]*)<\/s>/g)];
      if (segs.length > 0) {
        return segs.map((s) => s[1]).join("");
      }
      // Fallback: plain text content (non-segment format)
      return m[1].replace(/<[^>]+>/g, "");
    })
    .filter((t) => t.trim());

  if (segments.length === 0) return null;

  return segments
    .join(" ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function scrapeYouTube(
  url: string,
): Promise<YouTubeResult | null> {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Fetch metadata via oEmbed (no API key needed)
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  const res = await fetch(oembedUrl);
  if (!res.ok) return null;

  const oembed = await res.json();

  // Fetch transcript via Android innertube API
  let transcript: string | null = null;
  try {
    transcript = await fetchTranscript(videoId);
  } catch {
    // No captions available — bookmark still saves without transcript
  }

  return {
    title: oembed.title,
    author: oembed.author_name,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    transcript,
    videoUrl: watchUrl,
  };
}
