import { Command } from "commander";
import { apiRequest } from "../lib/api";

const CATEGORIES = ["core", "goals", "preferences", "interests"] as const;

export const registerIdentityCommand = (program: Command) => {
  const identity = program
    .command("identity")
    .description("Manage identity — persistent context about the user (name, goals, preferences, interests)");

  identity
    .command("list")
    .option("-s, --search <string>", "Search identity entries")
    .option("--category <category>", "Filter by category (core, goals, preferences, interests)")
    .option("-l, --limit <number>", "Max results", "20")
    .option("-o, --offset <number>", "Skip results")
    .option("-p, --pretty", "Human-readable output")
    .description("List identity entries")
    .action(async (option) => {
      const searchParams = new URLSearchParams();
      searchParams.append("type", "identity");
      if (option.limit) searchParams.append("limit", String(parseInt(option.limit, 10)));
      if (option.offset) searchParams.append("offset", String(parseInt(option.offset, 10)));
      if (option.search) searchParams.append("search", option.search);
      const result = await apiRequest(`memory?${searchParams.toString()}`, "GET");

      if (!option.pretty) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      let { data } = result;

      // Client-side category filter (API doesn't filter by metadata)
      if (option.category) {
        data = data.filter(
          (m: Record<string, unknown>) =>
            (m.metadata as Record<string, unknown>)?.category === option.category,
        );
      }

      if (data.length === 0) {
        console.log("No identity entries found.");
        return;
      }
      for (const m of data) {
        const category = (m.metadata as Record<string, unknown>)?.category || "uncategorized";
        const title = m.title || (m.content as string)?.slice(0, 80) || "Untitled";
        const truncated = title.length > 80 ? title.slice(0, 80) + "..." : title;
        console.log(`  ${truncated}`);
        console.log(`  ${category}`);
        console.log();
      }
      console.log(`Showing ${data.length} entries`);
    });

  identity
    .command("add")
    .description("Add an identity entry")
    .argument("<content>", "Identity content (e.g. \"Solo founder based in Nepal, building Supacortex\")")
    .option("-t, --title <string>", "Title (e.g. \"Core profile\", \"Tech preferences\")")
    .option("--category <category>", "Category: core, goals, preferences, interests")
    .option("-m, --metadata <json>", "Additional metadata as JSON")
    .option("-p, --pretty", "Human-readable output")
    .action(async (content, option) => {
      const metadata: Record<string, unknown> = {};
      if (option.metadata) {
        try {
          Object.assign(metadata, JSON.parse(option.metadata));
        } catch {
          console.error("Error: --metadata must be valid JSON");
          process.exit(1);
        }
      }
      if (option.category) {
        if (!CATEGORIES.includes(option.category)) {
          console.error(`Error: --category must be one of: ${CATEGORIES.join(", ")}`);
          process.exit(1);
        }
        metadata.category = option.category;
      }

      const body: Record<string, unknown> = {
        type: "identity",
        content,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };
      if (option.title) body.title = option.title;

      const result = await apiRequest("memory", "POST", body);
      if (!option.pretty) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Identity added: ${result.title || (result.content as string)?.slice(0, 60) || result.id}`);
    });

  identity
    .command("get")
    .description("Get an identity entry by ID")
    .argument("<id>", "Identity entry ID")
    .option("-p, --pretty", "Human-readable output")
    .action(async (id, option) => {
      const data = await apiRequest(`memory/${id}`, "GET");
      if (!option.pretty) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      const category = (data.metadata as Record<string, unknown>)?.category || "uncategorized";
      console.log(`ID:       ${data.id}`);
      console.log(`Category: ${category}`);
      console.log(`Title:    ${data.title || "(none)"}`);
      console.log(`Content:  ${data.content}`);
      if (data.metadata) console.log(`Metadata: ${JSON.stringify(data.metadata)}`);
      console.log(`Created:  ${data.createdAt}`);
      if (data.updatedAt) console.log(`Updated:  ${data.updatedAt}`);
    });

  identity
    .command("update")
    .description("Update an identity entry")
    .argument("<id>", "Identity entry ID")
    .option("-t, --title <string>", "New title")
    .option("-c, --content <string>", "New content")
    .option("--category <category>", "Change category (core, goals, preferences, interests)")
    .option("-m, --metadata <json>", "New metadata as JSON")
    .option("-p, --pretty", "Human-readable output")
    .action(async (id, option) => {
      const body: Record<string, unknown> = {};
      if (option.title) body.title = option.title;
      if (option.content) body.content = option.content;
      if (option.category || option.metadata) {
        const metadata: Record<string, unknown> = {};
        if (option.metadata) {
          try {
            Object.assign(metadata, JSON.parse(option.metadata));
          } catch {
            console.error("Error: --metadata must be valid JSON");
            process.exit(1);
          }
        }
        if (option.category) {
          if (!CATEGORIES.includes(option.category)) {
            console.error(`Error: --category must be one of: ${CATEGORIES.join(", ")}`);
            process.exit(1);
          }
          metadata.category = option.category;
        }
        body.metadata = metadata;
      }
      if (Object.keys(body).length === 0) {
        console.error("Error: provide at least one field to update (--title, --content, --category, --metadata)");
        process.exit(1);
      }
      const result = await apiRequest(`memory/${id}`, "PATCH", body);
      if (!option.pretty) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Identity updated: ${result.title || result.id}`);
    });

  identity
    .command("delete")
    .description("Delete an identity entry")
    .argument("<id>", "Identity entry ID")
    .option("-p, --pretty", "Human-readable output")
    .action(async (id, option) => {
      const result = await apiRequest(`memory/${id}`, "DELETE");
      if (!option.pretty) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log("Identity entry deleted.");
    });
};
