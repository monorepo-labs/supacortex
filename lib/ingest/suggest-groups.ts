import { openRouter } from "@/services/open-router";

type BookmarkInput = {
  title: string | null;
  content: string | null;
  type: string;
};

// Colors to cycle through for auto-created groups
export const GROUP_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
];

/**
 * Suggest new group names based on a batch of bookmarks.
 * Only suggests groups when 3+ bookmarks share a common topic.
 */
export async function suggestGroups(
  bookmarks: BookmarkInput[],
  existingGroups: string[],
): Promise<string[]> {
  if (bookmarks.length < 10) return [];

  const descriptions = bookmarks.map((b, i) => {
    const text = b.type === "tweet"
      ? b.content ?? ""
      : b.title ?? "";
    return `${i + 1}. ${text || "(no description)"}`;
  }).join("\n");

  const existingList = existingGroups.length > 0
    ? `Existing groups (do NOT duplicate): ${existingGroups.join(", ")}`
    : "No existing groups.";

  const prompt = `You are analyzing a batch of bookmarks to suggest category groups for a personal bookmark library.

${existingList}

Bookmarks:
${descriptions}

Rules:
- Group names must be 1-2 words max, like "AI", "Web Dev", "Startups", "Design"
- Do NOT duplicate existing groups or suggest very similar names
- Be conservative — only suggest a group if it represents a clear, recurring interest worth organizing
- 3 bookmarks sharing a vague theme is NOT enough. The topic should feel like a distinct category the user actively follows
- Most batches need 0-2 new groups. Don't over-categorize
- Return ONLY valid JSON, no markdown fences
- If no good groups can be formed, return an empty array

Return a JSON array of group name strings: ["Group Name", ...]`;

  try {
    const completion = await openRouter.chat.send({
      chatGenerationParams: {
        models: [
          "x-ai/grok-4.1-fast",
          "moonshotai/kimi-k2.5",
          "google/gemini-3-flash-preview",
        ],
        messages: [{ role: "user", content: prompt }],
        stream: false,
      },
    });

    const raw = String(completion.choices?.[0]?.message?.content ?? "");
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as string[];

    if (!Array.isArray(parsed)) return [];

    // Filter out any that match existing groups (case-insensitive)
    const existingLower = new Set(existingGroups.map((g) => g.toLowerCase()));
    return parsed.filter(
      (name) => typeof name === "string" && !existingLower.has(name.toLowerCase()),
    );
  } catch (error) {
    console.error("[suggest-groups] failed:", error);
    return [];
  }
}
