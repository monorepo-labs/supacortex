import { OpenRouter } from "@openrouter/sdk";

// @ts-expect-error — defaultHeaders is supported at runtime but missing from SDK types
export const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  serverURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://supacortex.ai",
    "X-Title": "Supacortex",
  },
});
