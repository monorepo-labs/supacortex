import { Command } from "commander";
import { apiRequest } from "../lib/api";

const TIERS = ["brief", "summary", "detailed"] as const;
type Tier = (typeof TIERS)[number];

const tierType = (tier: Tier) => `conversation_${tier}`;

export const registerConversationCommand = (program: Command) => {
  const convo = program
    .command("conversation")
    .description("Manage conversation memories — summaries of AI chat sessions");

  convo
    .command("list")
    .option("-s, --search <string>", "Search conversations")
    .option("--tier <tier>", "Filter by tier (brief, summary, detailed)")
    .option("-l, --limit <number>", "Max results", "20")
    .option("-o, --offset <number>", "Skip results")
    .option("-p, --pretty", "Human-readable output")
    .description("List saved conversations")
    .action(async (option) => {
      const searchParams = new URLSearchParams();
      if (option.limit) searchParams.append("limit", String(parseInt(option.limit, 10)));
      if (option.offset) searchParams.append("offset", String(parseInt(option.offset, 10)));
      if (option.search) searchParams.append("search", option.search);
      if (option.tier) {
        if (!TIERS.includes(option.tier)) {
          console.error(`Error: --tier must be one of: ${TIERS.join(", ")}`);
          process.exit(1);
        }
        searchParams.append("type", tierType(option.tier));
      } else {
        searchParams.append("typePrefix", "conversation_");
      }
      const result = await apiRequest(`memory?${searchParams.toString()}`, "GET");

      if (!option.pretty) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const { data: conversations } = result;
      if (conversations.length === 0) {
        console.log("No conversations found.");
        return;
      }
      for (const m of conversations) {
        const title = m.title || (m.content as string)?.slice(0, 80) || "Untitled";
        const truncated = title.length > 80 ? title.slice(0, 80) + "..." : title;
        const tier = String(m.type).replace("conversation_", "");
        const date = m.createdAt ? new Date(m.createdAt as string).toISOString().slice(0, 10) : "";
        console.log(`  ${truncated}`);
        console.log(`  ${tier} · ${date}`);
        console.log();
      }
      console.log(`Showing ${conversations.length} conversations`);
    });

  convo
    .command("add")
    .description("Save a conversation summary")
    .argument("<content>", "Conversation summary text")
    .requiredOption("--tier <tier>", "Tier: brief (1 sentence), summary (bullet points), detailed (full document)")
    .option("-t, --title <string>", "Title for the conversation")
    .option("-m, --metadata <json>", "Metadata as JSON (e.g. source, sessionId, tags)")
    .option("-p, --pretty", "Human-readable output")
    .action(async (content, option) => {
      if (!TIERS.includes(option.tier)) {
        console.error(`Error: --tier must be one of: ${TIERS.join(", ")}`);
        process.exit(1);
      }
      const body: Record<string, unknown> = {
        type: tierType(option.tier),
        content,
      };
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
      if (!option.pretty) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Conversation saved: ${result.title || (result.content as string)?.slice(0, 60) || result.id}`);
    });

  convo
    .command("get")
    .description("Get a conversation by ID")
    .argument("<id>", "Conversation ID")
    .option("-p, --pretty", "Human-readable output")
    .action(async (id, option) => {
      const data = await apiRequest(`memory/${id}`, "GET");
      if (!option.pretty) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      const tier = String(data.type).replace("conversation_", "");
      console.log(`ID:       ${data.id}`);
      console.log(`Tier:     ${tier}`);
      console.log(`Title:    ${data.title || "(none)"}`);
      console.log(`Content:  ${(data.content as string)?.slice(0, 500)}${(data.content as string)?.length > 500 ? "…" : ""}`);
      if (data.metadata) console.log(`Metadata: ${JSON.stringify(data.metadata)}`);
      console.log(`Created:  ${data.createdAt}`);
      if (data.updatedAt) console.log(`Updated:  ${data.updatedAt}`);
    });

  convo
    .command("update")
    .description("Update a saved conversation")
    .argument("<id>", "Conversation ID")
    .option("-t, --title <string>", "New title")
    .option("-c, --content <string>", "New content")
    .option("--tier <tier>", "Change tier (brief, summary, detailed)")
    .option("-m, --metadata <json>", "New metadata as JSON")
    .option("-p, --pretty", "Human-readable output")
    .action(async (id, option) => {
      const body: Record<string, unknown> = {};
      if (option.title) body.title = option.title;
      if (option.content) body.content = option.content;
      if (option.tier) {
        if (!TIERS.includes(option.tier)) {
          console.error(`Error: --tier must be one of: ${TIERS.join(", ")}`);
          process.exit(1);
        }
        body.type = tierType(option.tier);
      }
      if (option.metadata) {
        try {
          body.metadata = JSON.parse(option.metadata);
        } catch {
          console.error("Error: --metadata must be valid JSON");
          process.exit(1);
        }
      }
      if (Object.keys(body).length === 0) {
        console.error("Error: provide at least one field to update (--title, --content, --tier, --metadata)");
        process.exit(1);
      }
      const result = await apiRequest(`memory/${id}`, "PATCH", body);
      if (!option.pretty) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Conversation updated: ${result.title || result.id}`);
    });

  convo
    .command("delete")
    .description("Delete a saved conversation")
    .argument("<id>", "Conversation ID")
    .option("-p, --pretty", "Human-readable output")
    .action(async (id, option) => {
      const result = await apiRequest(`memory/${id}`, "DELETE");
      if (!option.pretty) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log("Conversation deleted.");
    });
};
