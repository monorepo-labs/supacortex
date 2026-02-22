# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Supacortex — a personal knowledge workspace for bookmarking, reading, writing, and discovering connections across saved content.

## Stack

- **Framework**: Next.js 16 (App Router) on Vercel
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL on Railway, Drizzle ORM (camelCase → snake_case column mapping is configured automatically — don't pass explicit SQL column names in schema definitions)
- **Auth**: BetterAuth
- **Package manager**: pnpm
- **Path alias**: `@/*` maps to project root

## Commands

```bash
pnpm dev         # Start dev server
pnpm build       # Production build
pnpm start       # Start production server
pnpm lint        # ESLint
```

## Architecture

- `app/` — Next.js App Router pages and layouts (no `src/` directory)
  - `app/(marketing)/` — landing page route group
  - `app/(dashboard)/app/` — main app route group
  - `app/api/` — API routes
  - `app/components/` — React components (PascalCase: `SearchBar.tsx`)
- `db/` — Drizzle schema, migrations, seed
- `server/` — server-side logic, organized by domain
  - `server/bookmarks/queries.ts` — read operations
  - `server/bookmarks/mutations.ts` — write operations
  - `server/tags/queries.ts`, `mutations.ts` — same pattern
- `services/` — external service clients (`db.ts`, future: `twitter.ts`)
- `hooks/` — React hooks (`use-bookmarks.ts`, kebab-case)
- `lib/` — generic utilities
- `config/` — app config and constants
- `types/` — shared TypeScript types
- `drizzle/` — generated migration files

## File Naming

- **kebab-case** for all files: `queries.ts`, `use-bookmarks.ts`
- **PascalCase** for React components: `SearchBar.tsx`, `BookmarkNode.tsx`
- Hooks prefixed with `use`: `use-bookmarks.ts` → `useBookmarks`

## Design Principles

- UI must be minimal, clean, content-focused (Linear/Raindrop aesthetic)
- Lots of whitespace, subtle colors, great typography
- Fast — everything needs to feel instant
- Build for one user first (no multi-tenancy concerns in MVP)

## Scope

Content types: **tweets and links only**. No images, videos, or other media types. Built specifically for Twitter bookmarks.

## Build Phases

### Phase 1: MVP (done)
1. Frontend to read bookmarks — beautiful, minimal UI
2. Twitter API connection — OAuth 2.0 to connect account
3. Database — Railway Postgres + Drizzle schema for bookmarks
4. Vercel cron — syncs Twitter bookmarks to DB (Skipped)
5. Search, groups, reading modes

### Phase 2: Intelligence
- Smart auto-categorization (No longer doing it)
- Vector DB + RAG + BM25 hybrid search (Not now)
- Graph view (connections visualization)

### Phase 3: Writing and annotation (Not yet)
- Long-form notes
- Highlights and annotations 

### Phase 4: API and CLI
- Server with public API
- CLI tool that uses the API

## Worktrees

After entering a worktree, always symlink env files from the project root:
```bash
ln -sf /Users/yogesh/Documents/supercortex/.env.local .env.local 2>/dev/null || true
ln -sf /Users/yogesh/Documents/supercortex/.env .env 2>/dev/null || true
```

## Workflow

Yogesh is learning to code. He writes the code, Max (Claude) guides and explains. Max writes code only when asked. Max handles package installation and config scaffolding.

### Development Process (MANDATORY)

**This workflow MUST be followed for every task. No code work without an issue. No merging without review.**

**GitHub Project:** `Supacortex` (project #1, org: `monorepo-labs`)
- **Status:** Backlog → Ready → In progress → In review → Done
- **Priority:** P0, P1, P2
- **Size:** XS, S, M, L, XL

Every task follows this lifecycle:

1. **Create Issue** — Before any code work, create a GitHub issue (`gh issue create`). It auto-attaches to the project board.
2. **Move to In Progress** — Set the project Status field to "In progress" before starting work.
   ```bash
   gh project item-edit --project-id PVT_kwDOD5vh7c4BPZnh --id <ITEM_ID> --field-id PVTSSF_lADOD5vh7c4BPZnhzg90dHw --single-select-option-id 47fc9ee4
   ```
3. **Do the work** — Implement on a feature branch.
4. **Create PR** — Open a PR and link it to the issue (`Closes #N` in the PR body). Move status to "In review".
5. **Code Review (Devin)** — Devin (AI code reviewer) automatically reviews the PR. After creating the PR:
   - Share the Devin review URL with the user: `https://app.devin.ai/review/monorepo-labs/supacortex/pull/<PR_NUMBER>`
   - Poll the PR for review comments every 30 seconds (`gh pr view <number> --comments`, `gh api repos/{owner}/{repo}/pulls/{number}/reviews`)
   - When Devin's review arrives, evaluate each comment — fix legitimate issues, ignore false positives
   - Push fixes and continue polling until Devin has no more actionable feedback
6. **Merge** — Only merge when the user explicitly says to. Merge the PR, close the issue, and move status to "Done".
