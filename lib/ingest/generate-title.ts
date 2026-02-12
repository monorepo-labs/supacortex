import { openRouter } from "@/services/open-router";

export const generateTitle = async (content: string): Promise<string> => {
  const completion = await openRouter.chat.send({
    chatGenerationParams: {
      models: [
        "x-ai/grok-4.1-fast",
        "moonshotai/kimi-k2.5",
        "google/gemini-3-flash-preview",
      ],
      messages: [
        {
          role: "user",
          content: `Generate a short, descriptive title (max 10 words) for this content. Return only the title, nothing else.\n\n${content}`,
        },
      ],
      stream: false,
    },
  });
  return String(completion.choices?.[0]?.message?.content ?? "");
};
