import { Command } from "commander";
import { setConfig } from "../lib/config";

export const registerEndpointCommand = (program: Command) => {
  program
    .command("endpoint")
    .argument("<url>", "API endpoint URL")
    .action((url) => {
      setConfig({ endpoint: url.trim() });
      console.log(`Endpoint updated to ${url.trim()}`);
    });
};
