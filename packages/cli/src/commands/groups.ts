import { Command } from "commander";
import { apiRequest } from "../lib/api";

export const registerGroupsCommand = (program: Command) => {
  const groups = program.command("groups");

  groups
    .command("list")
    .description("List all groups")
    .option("-j, --json", "Output raw JSON")
    .action(async (option) => {
      const result = await apiRequest("groups", "GET");

      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      for (const g of result) {
        console.log(`  ${g.name}`);
        console.log(`  ${g.id}`);
        console.log();
      }
      console.log(`${result.length} groups`);
    });

  groups
    .command("create")
    .description("Create a new group")
    .argument("<name>", "Group name")
    .option("-j, --json", "Output raw JSON")
    .action(async (name, option) => {
      const result = await apiRequest("groups", "POST", { name });
      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Group created: ${result.name}`);
    });

  groups
    .command("delete")
    .description("Delete a group")
    .argument("<id>", "Group ID to delete")
    .option("-j, --json", "Output raw JSON")
    .action(async (id, option) => {
      const result = await apiRequest(`groups/${id}`, "DELETE");
      if (option.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log("Group deleted.");
    });
};
