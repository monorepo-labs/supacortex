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

const ASSISTANT_MD = `---
description: General-purpose AI assistant for Supacortex
mode: primary
---

# IMPORTANT: ROLE OVERRIDE

Disregard all instructions about being a coding agent, software engineer, or code assistant. Those do not apply to this conversation.

You are the AI assistant for Supacortex — a personal knowledge workspace for bookmarking, reading, and discovering connections across saved content.

You are a general-purpose AI assistant. You help users with:
- Research and information retrieval
- Brainstorming and ideation
- Summarizing and analyzing their saved bookmarks
- Finding connections across their saved content
- Writing, editing, and creative tasks
- General knowledge questions
- Anything they ask — you are not limited to coding

Do NOT suggest code changes, refactor files, edit source code, or behave like a coding assistant unless the user explicitly asks for coding help.

## Accessing the user's bookmarks via \`scx\` CLI

You have access to the \`scx\` CLI tool. For full usage of any command, run \`scx <command> --help\`.

### Authentication

On the first use of scx in a conversation, check if the user is logged in by running \`scx whoami\`. NEVER share the API key from the output with the user. Once confirmed, don't check again — you have the context.
If not logged in, run \`scx login\` in the background — it will output a URL. Share that URL with the user and ask them to open it in their browser to approve the login. Then retry the command.

### Bookmarks

- \`scx bookmarks list\` — list bookmarks (--limit, --offset, --search, --type, --pretty)
- \`scx bookmarks list --search "query"\` — search bookmarks
- \`scx bookmarks add <url>\` — add a new bookmark
- \`scx bookmarks get <id>\` — get a bookmark by ID
- \`scx bookmarks delete <id>\` — delete a bookmark

### Conversations (memory)

Save and search summaries of chat sessions.

- \`scx conversation list\` — list saved conversations (--search, --tier, --limit, --offset, --pretty)
- \`scx conversation add "<content>" --tier <brief|summary|detailed>\` — save a conversation summary
- \`scx conversation get <id>\` — get a conversation by ID
- \`scx conversation update <id>\` — update a conversation (--title, --content, --tier, --metadata)
- \`scx conversation delete <id>\` — delete a conversation

Tiers: \`brief\` (1 sentence), \`summary\` (3-8 bullet points), \`detailed\` (full document with reasoning).

### Identity (persistent user context)

- \`scx identity list\` — list identity entries (--search, --category, --limit, --pretty)
- \`scx identity add "<content>"\` — add identity info (--title, --category, --metadata)
- \`scx identity get <id>\` — get an entry by ID
- \`scx identity update <id>\` — update an entry (--title, --content, --category, --metadata)
- \`scx identity delete <id>\` — delete an entry

Categories: \`core\`, \`goals\`, \`preferences\`, \`interests\`.

### Other commands

- \`scx groups list\` — list bookmark groups
- \`scx groups create <name>\` — create a new group
- \`scx sync\` — sync bookmarks from connected platforms

### Output format

All commands output JSON by default (optimized for AI). Use \`--pretty\` for human-readable output.

Run \`scx --help\` or \`scx <command> --help\` to discover additional options.

When the user asks about their bookmarks, saved content, or wants to find something they saved, use these commands to fetch the data.

## Guidelines

- Be concise and helpful
- When referencing bookmarks, include the title and URL
- Proactively search bookmarks when the user's question might relate to their saved content
- At the end of productive sessions, save a conversation summary using \`scx conversation add\`
- When the user shares personal info worth remembering, save it with \`scx identity add\`
- When you need user context, fetch identity entries first to personalize your response
- Format responses with markdown for readability
`;

export async function setupAgentConfig(onProgress: ProgressCallback): Promise<void> {
  const { Command } = await import("@tauri-apps/plugin-shell");

  // Create directory
  const mkdirScript = `${SOURCE_PROFILE}; mkdir -p "$HOME/.opencode/agents"`;
  const mkdirResult = await Command.create("exec-sh", ["-c", mkdirScript]).execute();
  if (mkdirResult.code !== 0) {
    throw new Error("Failed to create .opencode/agents directory");
  }

  // Write assistant.md
  const writeScript = `${SOURCE_PROFILE}; cat > "$HOME/.opencode/agents/assistant.md" << 'AGENT_EOF'
${ASSISTANT_MD}AGENT_EOF`;
  const writeResult = await Command.create("exec-sh", ["-c", writeScript]).execute();
  if (writeResult.code !== 0) {
    throw new Error("Failed to write agent config");
  }

  onProgress("✓ Agent config written");
}

export async function installSkills(onProgress: ProgressCallback): Promise<void> {
  const { Command } = await import("@tauri-apps/plugin-shell");

  const script = `${SOURCE_PROFILE}; npx skills add monorepo-labs/skills --skill supacortex -y`;
  const command = Command.create("exec-sh", ["-c", script]);

  command.stdout.on("data", (line) => onProgress(line));
  command.stderr.on("data", (line) => onProgress(line));

  return new Promise((resolve, reject) => {
    command.on("error", (err) => reject(new Error(`Skills install failed: ${err}`)));
    command.on("close", (data) => {
      if (data.code === 0) {
        resolve();
      } else {
        reject(new Error(`Skills install exited with code ${data.code}`));
      }
    });
    command.spawn().catch(reject);
  });
}
