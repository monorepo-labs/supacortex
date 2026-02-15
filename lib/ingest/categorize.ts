import { openRouter } from "@/services/open-router";

type BookmarkInput = {
  id: string;
  title: string | null;
  content: string | null;
  type: string;
};

type GroupInput = {
  id: string;
  name: string;
};

/**
 * Categorize bookmarks into existing groups using AI.
 * Sends all bookmarks in one call. Returns a map of bookmarkId → matched groupIds.
 * For tweets, passes title + content. For everything else, title only.
 */
export async function categorizeBookmarks(
  bookmarks: BookmarkInput[],
  groups: GroupInput[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();

  if (bookmarks.length === 0 || groups.length === 0) return result;

  // Build the bookmark descriptions for the prompt
  const bookmarkDescriptions = bookmarks.map((b) => {
    const text = b.type === "tweet"
      ? b.content ?? ""
      : b.title ?? "";
    return `[${b.id}]: ${text || "(no description)"}`;
  }).join("\n");

  const groupNames = groups.map((g) => g.name).join(", ");

  // Build a name→id lookup
  const nameToId = new Map<string, string>();
  for (const g of groups) {
    nameToId.set(g.name.toLowerCase(), g.id);
  }

  const prompt = `You are a bookmark categorizer. Given bookmarks and a list of groups, assign each bookmark to the groups it belongs to.

Groups: ${groupNames}

Bookmarks:
${bookmarkDescriptions}

Rules:
- Only assign a bookmark to a group if it clearly fits
- A bookmark can belong to multiple groups or no groups
- Do NOT force-fit — if nothing matches, return an empty array
- Return ONLY valid JSON, no markdown fences

Return a JSON object where keys are bookmark IDs and values are arrays of group names:
{"bookmark_id": ["group name", ...], ...}

If a bookmark doesn't match any group, include it with an empty array.`;

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

    // Parse the JSON response (strip markdown fences if present)
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, string[]>;

    // Map group names back to group IDs
    for (const [bookmarkId, groupNames] of Object.entries(parsed)) {
      const groupIds: string[] = [];
      for (const name of groupNames) {
        const id = nameToId.get(name.toLowerCase());
        if (id) groupIds.push(id);
      }
      if (groupIds.length > 0) {
        result.set(bookmarkId, groupIds);
      }
    }
  } catch (error) {
    console.error("[categorize] failed:", error);
  }

  return result;
}
