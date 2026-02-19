# Supacortex

A knowledge workspace where everything you consume and think gets connected automatically.

## Core Problem
Twitter bookmarks are hard to revisit, search is bad, no connections between saved items. Existing tools (MyMind, Raindrop, Notion) either lack AI chat, lack interconnections, or require manual linking.

## What It Does
- Bookmark anything: tweets, URLs, YouTube videos (transcribed), notes, thoughts
- Auto-categorization via AI
- Vector search across everything
- Connections: see related items automatically when you save or view something
- AI chat with full context — not just one bookmark, but across your entire library
- Read, write, think — mark things as read, revisit later, expand on ideas
- Beautiful UI that makes you want to live in it

## Stack
- **Frontend**: TBD (needs to be exceptional — this is the differentiator)
- **API**: Hono (fast)
- **Database**: PostgreSQL (users, profiles, tables, bookmark references)
- **Vector DB**: For embeddings, vector search, connections
- **ORM**: Drizzle
- **Auth**: BetterAuth
- **Language**: TypeScript

## Architecture
- PostgreSQL for structured data (users, profiles, bookmark metadata)
- Vector DB for embeddings and semantic search
- References between the two
- API layer with Hono
- CLI tool (later)
- AI chat built into the product

## Key Features (Priority Order)
1. **Data layer** — store bookmarks, notes with proper schema
2. **Vector search** — semantic search across everything (core feature, day 1)
3. **Frontend** — beautiful UI for exploring, reading, writing
4. **Auto-connections** — "this relates to X, Y, Z you saved before"
5. **Twitter bookmark sync** — auto-fetch via API
6. **AI chat** — start a conversation with full context of your library
7. **CLI** — for power users and AI agents
8. **YouTube transcription** — save and search video content

## Design Philosophy
- Not a list view — spatial, visual, interconnected
- Graph view like Obsidian but actually useful (meaningful clusters, weighted connections, context on hover, filtering, temporal layer)
- Fast. Everything has to be fast.
- Text-based primarily, expand later
