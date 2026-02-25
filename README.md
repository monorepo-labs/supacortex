# Supacortex

One memory for all your AI.

Supacortex is a personal knowledge workspace — save bookmarks, sync your X/Twitter bookmarks, take notes, and search across everything. It works as a web app, a native Mac app, and a CLI that plugs into any terminal-based AI tool.

## Features

- **X Bookmark Sync** — Connect your X account and import all your bookmarks automatically
- **Save Links & Videos** — Full content extraction with YouTube transcript support
- **Full-Text Search** — Search across all your saved content instantly
- **CLI First** — Works in Claude Code, terminal AI tools, or standalone
- **AI Chat** — Local-first conversations powered by OpenCode (desktop app)
- **Private by Default** — AI conversations stay on your device unless you save them
- **API** — Public REST API for building integrations

## Get Started

### Mac App (recommended)

Download from [supacortex.ai](https://supacortex.ai) — includes the CLI, AI chat, and reader.

### CLI Only

```bash
npm i -g @supacortex/cli
scx login
scx bookmarks list
```

## Project Structure

```
app/              → Next.js App Router (web app)
packages/cli/     → CLI tool (@supacortex/cli)
packages/api/     → Hono API server
packages/desktop/ → Tauri Mac app
server/           → Shared data access layer
db/               → Drizzle schema & migrations
```

## Development

```bash
pnpm install
pnpm dev
```

Requires Node.js 20+ and pnpm.

## Tech Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS v4
- PostgreSQL + Drizzle ORM
- Hono (API server)
- Tauri (desktop app)
- BetterAuth (authentication)

## License

[MIT](LICENSE)
