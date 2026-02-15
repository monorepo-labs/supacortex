# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Supercortex — a personal knowledge workspace for bookmarking, reading, writing, and discovering connections across saved content.

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
4. Vercel cron — syncs Twitter bookmarks to DB
5. Search, groups, reading modes

### Phase 2: Intelligence
- Smart auto-categorization
- Vector DB + RAG + BM25 hybrid search
- Graph view (connections visualization)

### Phase 3: Writing and annotation
- Long-form notes
- Highlights and annotations

### Phase 4: API and CLI
- Server with public API
- CLI tool that uses the API

## Workflow

Yogesh is learning to code. He writes the code, Max (Claude) guides and explains. Max writes code only when asked. Max handles package installation and config scaffolding.
