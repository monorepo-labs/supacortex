import {
  createOpencodeClient,
  type OpencodeClient,
} from "@opencode-ai/sdk/client";

const PORT = 3837;

let clientInstance: OpencodeClient | null = null;

export const getClient = (): OpencodeClient => {
  if (!clientInstance) {
    clientInstance = createOpencodeClient({
      baseUrl: `http://127.0.0.1:${PORT}`,
    });
  }
  return clientInstance;
};

export const isRunning = async (): Promise<boolean> => {
  try {
    await getClient().session.list();
    return true;
  } catch {
    return false;
  }
};

export const startServer = async () => {
  const { Command } = await import("@tauri-apps/plugin-shell");
  const command = Command.create("exec-sh", [
    "-c",
    `export PATH="$HOME/.opencode/bin:$HOME/.local/bin:/usr/local/bin:$PATH" && opencode serve --port ${PORT}`,
  ]);
  command.on("error", (err) => console.error("[opencode] error:", err));
  command.stdout.on("data", (line) => console.log("[opencode]", line));
  command.stderr.on("data", (line) => console.error("[opencode]", line));

  const child = await command.spawn();

  // Poll until server is ready
  let retries = 20;
  while (retries > 0) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isRunning()) return child;
    retries--;
  }
  throw new Error("OpenCode server failed to start");
};

export const OPENCODE_PORT = PORT;
