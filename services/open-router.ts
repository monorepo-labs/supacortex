import { OpenRouter } from "@openrouter/sdk";

export const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  serverURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://supacortex.ai",
    "X-Title": "Supacortex",
  },
});
