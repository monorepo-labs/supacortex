import { Command } from "commander";
import { getConfig } from "../lib/config";

export const registerWhoamiCommand = (program: Command) => {
  program.command("whoami").description("Show current config").action(() => {
    const { endpoint, apiKey } = getConfig();
    console.log(`Endpoint: ${endpoint ?? "not set"}`);
    console.log(`API Key: ${apiKey ?? "not set"}`);
  });
};
