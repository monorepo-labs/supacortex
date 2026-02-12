import { OpenRouter } from "@openrouter/sdk";

export const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});
