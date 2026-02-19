import { Command } from "commander";
import { execSync } from "node:child_process";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@supacortex/cli/latest";

export const registerUpdateCommand = (program: Command, version: string) => {
  program
    .command("update")
    .description("Update Supacortex CLI to the latest version")
    .action(async () => {
      const currentVersion = version;
      console.log(`Current version: ${currentVersion}`);
      console.log("Checking for updates...");
      console.log();

      try {
        const res = await fetch(NPM_REGISTRY_URL);
        if (!res.ok) throw new Error("Failed to check npm registry");

        const data = await res.json();
        const latest = data.version;

        if (latest === currentVersion) {
          console.log("Already on the latest version.");
          return;
        }

        console.log(`New version available: ${latest}`);
        console.log();
        console.log("Updating...");

        try {
          execSync("npm update -g @supacortex/cli", { stdio: "ignore" });
          console.log(`Updated to ${latest}`);
        } catch {
          console.log("Automatic update failed.");
          console.log();
          console.log("Update manually:");
          console.log("  npm install -g @supacortex/cli@latest");
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
};
