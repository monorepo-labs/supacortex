export const scrapeContent = async (url: string) => {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      "X-Return-Format": "markdown",
    },
  });
  if (!res.ok) return "";
  return res.json();
};
