import { getConfig } from "./config";

const DEFAULT_ENDPOINT = "https://api.supacortex.ai";
const DEFAULT_APP_URL = "https://supacortex.ai";

export const getEndpoint = () => {
  const config = getConfig();
  return config.endpoint || DEFAULT_ENDPOINT;
};

export const getAppUrl = () => {
  return process.env.SCX_APP_URL || getConfig().appUrl || DEFAULT_APP_URL;
};

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
  const endpoint = getEndpoint();
  const url = `${endpoint}/v1/${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    console.error(`Failed to connect to ${endpoint}`);
    process.exit(1);
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const message = errorBody?.error || `${res.status} ${res.statusText}`;
    console.error(`Error: ${message}`);
    process.exit(1);
  }

  const data = await res.json();
  return data;
};
