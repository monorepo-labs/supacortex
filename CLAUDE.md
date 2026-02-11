# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Supercortex — a personal knowledge workspace for bookmarking, reading, writing, and discovering connections across saved content.

## Stack

- **Framework**: Next.js 16 (App Router) on Vercel
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL on Railway, Drizzle ORM
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
- API routes go in `app/api/`
- Database schema and migrations live in `db/`
- Vercel cron jobs configured in `vercel.json`

## Design Principles

- UI must be minimal, clean, content-focused (Linear/Raindrop aesthetic)
- Lots of whitespace, subtle colors, great typography
- Fast — everything needs to feel instant
- Build for one user first (no multi-tenancy concerns in MVP)

## Build Phases

### Phase 1: MVP (current)
1. Frontend to read bookmarks — beautiful, minimal UI
2. Twitter API connection — OAuth 2.0 to connect account
3. Database — Railway Postgres + Drizzle schema for bookmarks
4. Vercel cron — syncs Twitter bookmarks to DB

### Phase 2: Expand content types
- Save arbitrary links (not just tweets)
- Add text/notes

### Phase 3: Intelligence
- Smart auto-categorization
- Vector DB + RAG + BM25 hybrid search
- Graph view (connections visualization)

### Phase 4: Writing and annotation
- Long-form notes
- Highlights and annotations

### Phase 5: API and CLI
- Server with public API
- CLI tool that uses the API

## Workflow

Yogesh is learning to code. He writes the code, Max (Claude) guides and explains. Max writes code only when asked. Max handles package installation and config scaffolding.
