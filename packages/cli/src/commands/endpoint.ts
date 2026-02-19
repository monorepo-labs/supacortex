import { Command } from "commander";
import { getConfig, setConfig, writeConfig } from "../lib/config";

export const registerEndpointCommand = (program: Command) => {
  program
    .command("endpoint")
    .argument("[url]", "API endpoint URL")
    .description("Show, set, or reset the API endpoint")
    .action((url) => {
      if (!url) {
        const config = getConfig();
        console.log(config.endpoint || "Using default endpoint.");
        return;
      }
      if (url === "reset") {
        const { endpoint, ...rest } = getConfig();
        writeConfig(rest);
        console.log("Endpoint reset to default.");
        return;
      }
      setConfig({ endpoint: url.trim() });
      console.log(`Endpoint updated to ${url.trim()}`);
    });
};
