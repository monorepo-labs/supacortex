import { getConfig, setConfig } from "./config";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@supacortex/cli/latest";
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

const isNewer = (latest: string, current: string): boolean => {
  const l = latest.split(".").map(Number);
  const c = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (l[i] > c[i]) return true;
    if (l[i] < c[i]) return false;
  }
  return false;
};

export const checkForUpdates = (currentVersion: string) => {
  const config = getConfig();
  const now = Date.now();

  // Show cached notification if we already know there's a newer version
  if (config.latestVersion && isNewer(config.latestVersion, currentVersion)) {
    process.on("exit", () => {
      console.log();
      console.log(`  Update available: ${currentVersion} → ${config.latestVersion}`);
      console.log(`  Run "scx update" to update`);
      console.log();
    });
  }

  // Skip check if we checked recently
  if (config.lastUpdateCheck && now - config.lastUpdateCheck < CHECK_INTERVAL) {
    return;
  }

  // Non-blocking fetch — fire and forget
  fetch(NPM_REGISTRY_URL)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.version) {
        setConfig({
          lastUpdateCheck: now,
          latestVersion: data.version,
        });
      }
    })
    .catch(() => {
      // Silent fail — don't interrupt user's command
    });
};
