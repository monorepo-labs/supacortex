import { getConfig } from "./config";

export const apiRequest = async (
  path: string,
  method: string,
  body?: object,
) => {
  const config = getConfig();
  if (!config.apiKey) {
    console.error("Missing API key. Run: scx token <apikey>");
    process.exit(1);
  }
  const endpoint = config.endpoint || "https://api.supacortex.ai";
  const url = `${endpoint}/v1/${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    console.error("Error");
    process.exit(1);
  }
  const data = await res.json();
  return data;
};
