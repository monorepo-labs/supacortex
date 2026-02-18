import { Command } from "commander";
import { apiRequest } from "../lib/api";

export const registerBookmarksCommand = (program: Command) => {
  const bookmarks = program.command("bookmarks");

  bookmarks
    .command("list")
    .option("--limit <number>", "Max results", "20")
    .option("--offset <number>", "Skip results")
    .option("--search <string>", "Search bookmarks")
    .option("--json", "Output raw JSON")
    .description("List all bookmarks")
    .action(async (option) => {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(option)) {
        if (value && key !== "json") searchParams.append(key, value as string);
      }
      const result = await apiRequest(
        `bookmarks?${searchParams.toString()}`,
        "GET",
      );

      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const { data, total } = result;
      for (const b of data) {
        const label = b.type === "tweet" ? b.content : b.title;
        const truncated =
          label && label.length > 80 ? label.slice(0, 80) + "..." : label;
        console.log(`  ${truncated || "Untitled"}`);
        console.log(`  ${b.url}`);
        console.log(`  @${b.author || "unknown"} · ${b.type}`);
        console.log();
      }
      console.log(`Showing ${data.length} of ${total} bookmarks`);
    });

  bookmarks
    .command("add")
    .description("Add a new bookmark")
    .argument("<url>", "URL to bookmark")
    .option("--json", "Output raw JSON")
    .action(async (url, option) => {
      const result = await apiRequest("bookmarks", "POST", { url });
      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Bookmark added: ${result.title || result.url}`);
    });

  bookmarks
    .command("delete")
    .description("Delete a bookmark")
    .argument("<id>", "Bookmark ID to delete")
    .option("--json", "Output raw JSON")
    .action(async (id, option) => {
      const result = await apiRequest(`bookmarks/${id}`, "DELETE");
      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log("Bookmark deleted.");
    });
};
