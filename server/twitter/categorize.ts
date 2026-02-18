import { categorizeBookmarks } from "@/lib/ingest/categorize";
import { suggestGroups, GROUP_COLORS } from "@/lib/ingest/suggest-groups";
import { getGroupsForUser } from "@/server/groups/queries";
import { createGroup } from "@/server/groups/mutations";
import { addBookmarksToGroups } from "@/server/groups/bookmark-groups";

type InsertedBookmark = {
  id: string;
  title: string | null;
  content: string | null;
  type: string;
};

export async function autoCategorizeSync(userId: string, inserted: InsertedBookmark[]) {
  if (inserted.length === 0) return;

  let groups = await getGroupsForUser(userId);

  // If 10+ new bookmarks, suggest new groups first
  if (inserted.length >= 10) {
    const existingNames = groups.map((g) => g.name);
    const suggested = await suggestGroups(inserted, existingNames);

    if (suggested.length > 0) {
      console.log(`[sync:categorize] creating ${suggested.length} new groups: ${suggested.join(", ")}`);
      for (let i = 0; i < suggested.length; i++) {
        const color = GROUP_COLORS[(groups.length + i) % GROUP_COLORS.length];
        await createGroup({ name: suggested[i], color, createdBy: userId });
      }
      groups = await getGroupsForUser(userId);
    }
  }

  if (groups.length === 0) return;

  const matches = await categorizeBookmarks(inserted, groups);
  console.log(`[sync:categorize] matched ${matches.size}/${inserted.length} bookmarks`);

  for (const [bookmarkId, groupIds] of matches) {
    await addBookmarksToGroups([bookmarkId], groupIds);
  }
}
