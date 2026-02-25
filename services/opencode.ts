import {
  createOpencodeClient,
  type OpencodeClient,
} from "@opencode-ai/sdk/client";
import { invoke } from "@tauri-apps/api/core";

const PORT = 3837;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let clientInstance: OpencodeClient | null = null;

/**
 * Fetch that routes through Tauri's Rust proxy_fetch command.
 * Bypasses mixed-content blocking (HTTPS page → HTTP localhost).
 * The SDK passes a Request object (not separate url + init).
 */
const tauriFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  let url: string;
  let method = "GET";
  let body: string | undefined;
  let headers: Record<string, string> | undefined;

  if (input instanceof Request) {
    // SDK creates a Request object and passes it directly
    url = input.url;
    method = input.method;
    // Always try to read body for methods that have one
    try {
      const text = await input.text();
      if (text) body = text;
    } catch {
      // body may not be readable (GET requests)
    }
    headers = {};
    input.headers.forEach((v, k) => { headers![k] = v; });
  } else {
    url = typeof input === "string" ? input : input.href;
    method = init?.method || "GET";
    body = init?.body ? String(init.body) : undefined;
    if (init?.headers) {
      headers = {};
      const h = new Headers(init.headers);
      h.forEach((v, k) => { headers![k] = v; });
    }
  }

  const result = await invoke("proxy_fetch", { url, method, body, headers }) as string;
  const envelope = JSON.parse(result) as { status: number; body: string };

  // 204/304 responses cannot have a body
  const noBody = envelope.status === 204 || envelope.status === 304;
  return new Response(noBody ? null : envelope.body, {
    status: envelope.status,
    headers: noBody ? {} : { "content-type": "application/json" },
  });
}) as typeof globalThis.fetch;

export const getClient = (): OpencodeClient => {
  if (!clientInstance) {
    clientInstance = createOpencodeClient({
      baseUrl: BASE_URL,
      fetch: tauriFetch,
    });
  }
  return clientInstance;
};

export const isRunning = async (): Promise<boolean> => {
  try {
    const client = getClient();
    await client.session.list();
    return true;
  } catch {
    return false;
  }
};

export const startServer = async () => {
  const { Command } = await import("@tauri-apps/plugin-shell");

  // Source user's shell profile to get full PATH (nvm, bun, etc.)
  // macOS apps launched from Finder don't inherit shell env
  const command = Command.create("exec-sh", [
    "-c",
    `NVM_BIN=$(ls -d $HOME/.nvm/versions/node/*/bin 2>/dev/null | head -1); export PATH="$HOME/.opencode/bin:$HOME/.bun/bin:$HOME/.local/bin:/usr/local/bin\${NVM_BIN:+:\$NVM_BIN}:$PATH" && cd "$HOME" && opencode serve --port ${PORT}`,
  ]);

  let startupError = "";
  command.on("error", (err) => {
    console.error("[opencode] spawn error:", err);
    startupError = String(err);
  });
  command.stdout.on("data", (line) => console.log("[opencode]", line));
  command.stderr.on("data", (line) => {
    console.error("[opencode]", line);
    if (!line.includes("Warning:")) startupError += line + "\n";
  });

  const child = await command.spawn();
  console.log("[opencode] Spawned process, polling for readiness...");

  // Poll until server is ready
  let retries = 30;
  while (retries > 0) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isRunning()) {
      console.log("[opencode] Server is ready");
      return child;
    }
    retries--;
  }
  throw new Error(`OpenCode server failed to start: ${startupError || "timeout after 15s"}`);
};

let cachedHomeDir: string | null = null;

export const getHomeDir = async (): Promise<string> => {
  if (cachedHomeDir) return cachedHomeDir;
  try {
    const { homeDir } = await import("@tauri-apps/api/path");
    const home = await homeDir();
    cachedHomeDir = home.endsWith("/") ? home.slice(0, -1) : home;
  } catch {
    try {
      const { Command } = await import("@tauri-apps/plugin-shell");
      const result = await Command.create("exec-sh", ["-c", "echo $HOME"]).execute();
      cachedHomeDir = result.stdout?.trim() || null;
    } catch {
      // ignore
    }
  }
  return cachedHomeDir || "/";
};

export const OPENCODE_PORT = PORT;

// --- Session ID store (persisted in Tauri app data dir) ---

const SESSION_FILE = "sessions.json";

let cachedSessionIds: Set<string> | null = null;

async function readSessionFile(): Promise<string[]> {
  const { readTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
  try {
    const raw = await readTextFile(SESSION_FILE, { baseDir: BaseDirectory.AppData });
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function ensureAppDataDir(): Promise<void> {
  const { appDataDir } = await import("@tauri-apps/api/path");
  const dir = await appDataDir();
  const { Command } = await import("@tauri-apps/plugin-shell");
  await Command.create("exec-sh", ["-c", `mkdir -p "${dir}"`]).execute();
}

async function writeSessionFile(ids: string[]): Promise<void> {
  const { writeTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
  await ensureAppDataDir();
  await writeTextFile(SESSION_FILE, JSON.stringify(ids), { baseDir: BaseDirectory.AppData });
}

export async function getTrackedSessionIds(): Promise<Set<string>> {
  if (cachedSessionIds) return cachedSessionIds;
  try {
    const ids = await readSessionFile();
    cachedSessionIds = new Set(ids);
  } catch {
    cachedSessionIds = new Set();
  }
  return cachedSessionIds;
}

export async function trackSessionId(id: string): Promise<void> {
  const ids = await getTrackedSessionIds();
  if (ids.has(id)) return;
  ids.add(id);
  cachedSessionIds = ids;
  await writeSessionFile([...ids]);
}

export async function untrackSessionId(id: string): Promise<void> {
  const ids = await getTrackedSessionIds();
  if (!ids.has(id)) return;
  ids.delete(id);
  cachedSessionIds = ids;
  await writeSessionFile([...ids]);
}
