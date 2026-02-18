import { Command } from "commander";
import { setConfig } from "../lib/config";

export const registerTokenCommand = (program: Command) => {
  program
    .command("token")
    .argument("<apikey>", "API key to authenticate with")
    .action((key) => {
      setConfig({ apiKey: key.trim() });
      console.log("API key saved.");
    });
};
