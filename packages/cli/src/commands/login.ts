import { Command } from "commander";
import { setConfig } from "../lib/config";
import { getAppUrl } from "../lib/api";
import { exec } from "node:child_process";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const registerLoginCommand = (program: Command) => {
  program
    .command("login")
    .description("Authenticate with Supacortex via browser")
    .action(async () => {
      const appUrl = getAppUrl();

      // Step 1: Request device code
      let deviceCode: string;
      let userCode: string;
      let verifyUrl: string;

      try {
        const res = await fetch(`${appUrl}/api/cli/device`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          console.error("Failed to start login flow");
          process.exit(1);
        }
        const data = await res.json();
        deviceCode = data.deviceCode;
        userCode = data.userCode;
        verifyUrl = data.verifyUrl;
      } catch {
        console.error(`Failed to connect to ${appUrl}`);
        process.exit(1);
      }

      // Step 2: Show code and open browser
      const verifyWithCode = `${verifyUrl}?code=${userCode}`;
      console.log();
      console.log(`  Opening: ${verifyWithCode}`);
      console.log();
      console.log("  If the browser didn't open, copy and paste the URL above.");
      console.log();
      console.log("Waiting for authorization...");

      // Try to open browser
      const openCmd =
        process.platform === "darwin" ? "open" :
        process.platform === "win32" ? "start" : "xdg-open";
      exec(`${openCmd} "${verifyWithCode}"`);

      // Step 3: Poll for approval
      const maxAttempts = 180; // 15 min / 5s = 180
      for (let i = 0; i < maxAttempts; i++) {
        await sleep(5000);

        try {
          const res = await fetch(`${appUrl}/api/cli/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceCode }),
          });

          if (!res.ok) continue;

          const data = await res.json();

          if (data.status === "approved" && data.apiKey) {
            setConfig({ apiKey: data.apiKey });
            console.log("Logged in!");
            return;
          }

          if (data.status === "expired") {
            console.error("Code expired. Run `scx login` again.");
            process.exit(1);
          }
        } catch {
          // Network error, keep polling
        }
      }

      console.error("Code expired. Run `scx login` again.");
      process.exit(1);
    });
};
