import { readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";

const SETUP_FILE = "setup.json";
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// Shared PATH sourcing prefix (same as services/opencode.ts)
const SOURCE_PROFILE = `source "$HOME/.zshrc" 2>/dev/null || source "$HOME/.bashrc" 2>/dev/null || source "$HOME/.profile" 2>/dev/null; export PATH="$HOME/.opencode/bin:$HOME/.bun/bin:$HOME/.local/bin:/usr/local/bin:$PATH"`;

interface SetupState {
  setupComplete: boolean;
  lastCheckTime: number;
  opencodeInstalled: boolean;
  scxInstalled: boolean;
}

export interface DependencyStatus {
  opencode: boolean;
  scx: boolean;
}

type ProgressCallback = (line: string) => void;

// ── Setup state persistence ──────────────────────────────────────

export async function getSetupState(): Promise<SetupState | null> {
  try {
    const raw = await readTextFile(SETUP_FILE, { baseDir: BaseDirectory.AppData });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setSetupState(state: SetupState): Promise<void> {
  const { Command } = await import("@tauri-apps/plugin-shell");
  const { appDataDir } = await import("@tauri-apps/api/path");
  const dir = await appDataDir();
  await Command.create("exec-sh", ["-c", `mkdir -p "${dir}"`]).execute();
  await writeTextFile(SETUP_FILE, JSON.stringify(state), { baseDir: BaseDirectory.AppData });
}

export function isSetupFresh(state: SetupState): boolean {
  return state.setupComplete && (Date.now() - state.lastCheckTime) < TWENTY_FOUR_HOURS;
}

// ── Dependency checking ──────────────────────────────────────────

export async function checkDependencies(): Promise<DependencyStatus> {
  const { Command } = await import("@tauri-apps/plugin-shell");

  const script = `${SOURCE_PROFILE}; echo "opencode:$(command -v opencode >/dev/null 2>&1 && echo ok || echo missing)"; echo "scx:$(command -v scx >/dev/null 2>&1 && echo ok || echo missing)"`;

  const result = await Command.create("exec-sh", ["-c", script]).execute();
  const stdout = result.stdout || "";

  const opencode = stdout.includes("opencode:ok");
  const scx = stdout.includes("scx:ok");

  return { opencode, scx };
}

// ── Installation ─────────────────────────────────────────────────

export async function installOpencode(onProgress: ProgressCallback): Promise<void> {
  const { Command } = await import("@tauri-apps/plugin-shell");

  const script = `${SOURCE_PROFILE}; curl -fsSL https://opencode.ai/install | bash`;
  const command = Command.create("exec-sh", ["-c", script]);

  command.stdout.on("data", (line) => onProgress(line));
  command.stderr.on("data", (line) => onProgress(line));

  return new Promise((resolve, reject) => {
    command.on("error", (err) => reject(new Error(`Install failed: ${err}`)));
    command.on("close", (data) => {
      if (data.code === 0) {
        resolve();
      } else {
        reject(new Error(`Install exited with code ${data.code}`));
      }
    });
    command.spawn().catch(reject);
  });
}

export async function installScx(onProgress: ProgressCallback): Promise<void> {
  const { Command } = await import("@tauri-apps/plugin-shell");

  const script = `${SOURCE_PROFILE}; npm install -g @supacortex/cli`;
  const command = Command.create("exec-sh", ["-c", script]);

  command.stdout.on("data", (line) => onProgress(line));
  command.stderr.on("data", (line) => onProgress(line));

  return new Promise((resolve, reject) => {
    command.on("error", (err) => reject(new Error(`Install failed: ${err}`)));
    command.on("close", (data) => {
      if (data.code === 0) {
        resolve();
      } else {
        reject(new Error(`Install exited with code ${data.code}`));
      }
    });
    command.spawn().catch(reject);
  });
}
