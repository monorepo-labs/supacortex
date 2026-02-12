export const scrapeContent = async (url: string) => {
  const [jinaRes, ogImage] = await Promise.all([
    fetch(`https://r.jina.ai/${url}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
        "X-Return-Format": "markdown",
      },
    }),
    fetchOgImage(url),
  ]);

  if (!jinaRes.ok) return null;

  const jina = await jinaRes.json();
  return {
    title: jina.data.title as string | null,
    content: jina.data.content as string | null,
    ogImage,
  };
};

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const match = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    ) ?? html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
