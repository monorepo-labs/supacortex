import { Command } from "commander";
import { apiRequest } from "../lib/api";

export const registerMemoryCommand = (program: Command) => {
  const mem = program.command("memory");

  mem
    .command("list")
    .option("-t, --type <type>", "Filter by type (conversation_brief, conversation_summary, conversation_detailed, identity)")
    .option("-s, --search <string>", "Search memory")
    .option("-l, --limit <number>", "Max results", "20")
    .option("-o, --offset <number>", "Skip results")
    .option("-j, --json", "Output raw JSON")
    .description("List memory entries")
    .action(async (option) => {
      const searchParams = new URLSearchParams();
      if (option.limit) searchParams.append("limit", String(parseInt(option.limit, 10)));
      if (option.offset) searchParams.append("offset", String(parseInt(option.offset, 10)));
      if (option.search) searchParams.append("search", option.search);
      if (option.type) searchParams.append("type", option.type);
      const result = await apiRequest(`memory?${searchParams.toString()}`, "GET");

      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const { data } = result;
      if (data.length === 0) {
        console.log("No memory entries found.");
        return;
      }
      for (const m of data) {
        const title = m.title || m.content?.slice(0, 80) || "Untitled";
        const truncated = title.length > 80 ? title.slice(0, 80) + "..." : title;
        const date = m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : "";
        console.log(`  ${truncated}`);
        console.log(`  ${m.type} · ${date}`);
        console.log();
      }
      console.log(`Showing ${data.length} of ${result.meta?.count ?? data.length} entries`);
    });

  mem
    .command("add")
    .description("Add a new memory entry")
    .argument("<type>", "Memory type (conversation_brief, conversation_summary, conversation_detailed, identity)")
    .argument("<content>", "Content text")
    .option("-t, --title <string>", "Optional title")
    .option("-m, --metadata <json>", "Optional metadata as JSON string")
    .option("-j, --json", "Output raw JSON")
    .action(async (type, content, option) => {
      const body: Record<string, unknown> = { type, content };
      if (option.title) body.title = option.title;
      if (option.metadata) {
        try {
          body.metadata = JSON.parse(option.metadata);
        } catch {
          console.error("Error: --metadata must be valid JSON");
          process.exit(1);
        }
      }
      const result = await apiRequest("memory", "POST", body);
      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Memory added: ${result.title || result.content?.slice(0, 60) || result.id}`);
    });

  mem
    .command("get")
    .description("Get a memory entry by ID")
    .argument("<id>", "Memory ID")
    .option("-j, --json", "Output raw JSON")
    .action(async (id, option) => {
      const data = await apiRequest(`memory/${id}`, "GET");
      if (option.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      console.log(`ID:       ${data.id}`);
      console.log(`Type:     ${data.type}`);
      console.log(`Title:    ${data.title || "(none)"}`);
      console.log(`Content:  ${data.content?.slice(0, 200)}${data.content?.length > 200 ? "…" : ""}`);
      if (data.metadata) console.log(`Metadata: ${JSON.stringify(data.metadata)}`);
      console.log(`Created:  ${data.createdAt}`);
      if (data.updatedAt) console.log(`Updated:  ${data.updatedAt}`);
    });

  mem
    .command("update")
    .description("Update a memory entry")
    .argument("<id>", "Memory ID")
    .option("--title <string>", "New title")
    .option("--content <string>", "New content")
    .option("--type <string>", "New type")
    .option("--metadata <json>", "New metadata as JSON string")
    .option("-j, --json", "Output raw JSON")
    .action(async (id, option) => {
      const body: Record<string, unknown> = {};
      if (option.title) body.title = option.title;
      if (option.content) body.content = option.content;
      if (option.type) body.type = option.type;
      if (option.metadata) {
        try {
          body.metadata = JSON.parse(option.metadata);
        } catch {
          console.error("Error: --metadata must be valid JSON");
          process.exit(1);
        }
      }
      if (Object.keys(body).length === 0) {
        console.error("Error: provide at least one field to update (--title, --content, --type, --metadata)");
        process.exit(1);
      }
      const result = await apiRequest(`memory/${id}`, "PATCH", body);
      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Memory updated: ${result.title || result.id}`);
    });

  mem
    .command("delete")
    .description("Delete a memory entry")
    .argument("<id>", "Memory ID to delete")
    .option("-j, --json", "Output raw JSON")
    .action(async (id, option) => {
      const result = await apiRequest(`memory/${id}`, "DELETE");
      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log("Memory deleted.");
    });
};
