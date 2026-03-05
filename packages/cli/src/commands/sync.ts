import { Command } from "commander";
import { apiRequest } from "../lib/api";

export const registerSyncCommand = (program: Command) => {
  const sync = program
    .command("sync")
    .description("Sync bookmarks from connected platforms");

  sync
    .command("twitter", { isDefault: true })
    .description("Sync bookmarks from X (Twitter)")
    .action(async () => {
      console.log("Syncing X bookmarks...");

      const result = await apiRequest("sync", "POST");

      if (!result.synced) {
        console.log("Already up to date.");
      } else {
        console.log(`Synced ${result.synced} new bookmarks.`);
      }

      if (result.status === "interrupted") {
        const resetMsg = result.rateLimitResetsAt
          ? ` Resets at ${new Date(result.rateLimitResetsAt).toLocaleString()}`
          : "";
        console.log(`Rate limited.${resetMsg}`);
      }
    });

  sync
    .command("status")
    .description("Check latest sync status")
    .action(async () => {
      const result = await apiRequest("sync/status", "GET");

      if (result.status === "none") {
        console.log("No syncs yet.");
        return;
      }

      console.log(`Status:  ${result.status}`);
      console.log(`Synced:  ${result.tweetsSynced} / ${result.tweetsTotal}`);
      console.log(`Mode:    ${result.mode}`);
      if (result.createdAt) {
        console.log(`Last:    ${new Date(result.createdAt).toLocaleString()}`);
      }
    });
};
