import { Command } from "commander";
import { getConfig, writeConfig } from "../lib/config";

export const registerLogoutCommand = (program: Command) => {
  program
    .command("logout")
    .description("Log out and remove saved API key")
    .action(() => {
      const { apiKey, ...rest } = getConfig();
      if (!apiKey) {
        console.log("Not logged in.");
        return;
      }
      writeConfig(rest);
      console.log("Logged out.");
    });
};
