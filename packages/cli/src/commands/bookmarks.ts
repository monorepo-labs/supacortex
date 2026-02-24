import { Command } from "commander";
import { apiRequest } from "../lib/api";

export const registerBookmarksCommand = (program: Command) => {
  const bookmarks = program.command("bookmarks");

  bookmarks
    .command("list")
    .option("-l, --limit <number>", "Max results", "20")
    .option("-o, --offset <number>", "Skip results")
    .option("-s, --search <string>", "Search bookmarks")
    .option("-t, --type <string>", "Filter by type (tweet, link, youtube)")
    .option("-j, --json", "Output raw JSON")
    .description("List all bookmarks")
    .action(async (option) => {
      const searchParams = new URLSearchParams();
      if (option.limit) searchParams.append("limit", String(parseInt(option.limit, 10)));
      if (option.offset) searchParams.append("offset", String(parseInt(option.offset, 10)));
      if (option.search) searchParams.append("search", option.search);
      if (option.type) searchParams.append("type", option.type);
      const result = await apiRequest(
        `bookmarks?${searchParams.toString()}`,
        "GET",
      );

      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const { data } = result;
      for (const b of data) {
        const label = b.type === "tweet" ? b.content : b.title;
        const truncated =
          label && label.length > 80 ? label.slice(0, 80) + "..." : label;
        console.log(`  ${truncated || "Untitled"}`);
        console.log(`  ${b.url}`);
        console.log(`  ${b.author ? `@${b.author} · ` : ""}${b.type}`);
        console.log();
      }
      console.log(`Showing ${data.length} of ${result.meta?.total ?? data.length} bookmarks`);
    });

  bookmarks
    .command("add")
    .description("Add a new bookmark")
    .argument("<url>", "URL to bookmark")
    .option("-j, --json", "Output raw JSON")
    .action(async (url, option) => {
      const result = await apiRequest("bookmarks", "POST", { url });
      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Bookmark added: ${result.title || result.url}`);
    });

  bookmarks
    .command("get")
    .description("Get a bookmark by ID")
    .argument("<id>", "Bookmark ID")
    .option("-j, --json", "Output raw JSON")
    .action(async (id, option) => {
      const data = await apiRequest(`bookmarks/${id}`, "GET");
      if (option.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      console.log(`ID:      ${data.id}`);
      console.log(`Type:    ${data.type}`);
      console.log(`Title:   ${data.title || "(none)"}`);
      console.log(`URL:     ${data.url}`);
      if (data.author) console.log(`Author:  ${data.author}`);
      if (data.content) console.log(`Content: ${data.content.slice(0, 200)}${data.content.length > 200 ? "…" : ""}`);
      console.log(`Created: ${data.createdAt}`);
    });

  bookmarks
    .command("delete")
    .description("Delete a bookmark")
    .argument("<id>", "Bookmark ID to delete")
    .option("-j, --json", "Output raw JSON")
    .action(async (id, option) => {
      const result = await apiRequest(`bookmarks/${id}`, "DELETE");
      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log("Bookmark deleted.");
    });
};
