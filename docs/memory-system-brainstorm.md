# Memory System Brainstorm

From session on 2026-02-24. Full transcript: `session-memory-brainstorm.json`

## The Reframe: Bookmarks → Memory

Supacortex isn't a bookmark manager — it's a **memory system**. A bookmark is an action. A memory is a concept.

### Memory Types

| Type | What it is | Examples |
|---|---|---|
| **Saved content** | External things you captured | Tweets, links, YouTube — what bookmarks are today |
| **Conversations** | AI interaction summaries | Chat with Claude, ChatGPT, any LLM |
| **Identity** | Who you are, evolving over time | Name, goals, interests, preferences |
| ~~Mood~~ | ~~Emotional state~~ | Skipped for now |

## Schema Decision: Hybrid Approach

**Keep `bookmarks` as-is.** It has bookmark-specific concerns (URL uniqueness, grid layout, mediaUrls, tweetCreatedAt, isRead) that don't apply to other memory types.

**New `memory` table** for conversations, identity (and mood later). Shared shape:

```
id          uuid
type        text        — "conversation_brief", "conversation_summary", "conversation_detailed", "identity"
title       text
content     text
metadata    jsonb       — type-specific fields
created_at  timestamp
created_by  text
```

## Conversation Storage — Three Tiers

Not every AI conversation deserves the same depth. AI auto-decides the tier.

1. **Brief** — Single sentence. "Asked Claude how to parse JSON in Bun." Topic matters, content doesn't.
2. **Summary** — 3-8 bullet points. What was discussed, decided, key findings. Good for most working sessions.
3. **Detailed** — Full structured document. Findings, decisions, reasoning, code snippets, follow-ups. Reserved for deep sessions.

## Identity System (v1)

Identity = everything the AI needs to know about you to be useful without repeating yourself.

### Categories

- **Core** — name, location, timezone, what you do (set once, rarely changes)
- **Goals** — current focus, bigger picture (changes every few months)
- **Preferences** — how you work, tech choices, communication style (discovered over time)
- **Interests** — topics you're drawn to (keeps growing)

### How Identity Gets Updated

1. **Explicit** — `scx identity set "I'm Yogesh, solo founder..."` (initial setup)
2. **Incremental** — `scx identity add "Switched to Stripe for payments"` (user adds consciously)
3. **Inferred** — AI extracts from conversations (phase 2, not v1)

### v1 Storage

Just text entries with a category in the `memory` table:

| type | title | content | metadata |
|---|---|---|---|
| `identity` | "Core profile" | "Yogesh, solo founder based in Nepal..." | `{"category": "core"}` |
| `identity` | "Tech preferences" | "Next.js, Drizzle, Bun, Postgres..." | `{"category": "preferences"}` |
| `identity` | "Current focus" | "Building memory layer for Supacortex" | `{"category": "goals"}` |

## Search Architecture (Research)

Two approaches explored, no decision yet:

- **QMD** — Local CLI search engine by Tobi (Shopify). Simple, runs local, fits VPS workflow.
- **PageIndex** — Vectorless, reasoning-based RAG. No vector DB, no chunking. Hierarchical tree indexing + LLM reasoning. 98.7% on FinanceBench.

## Existing Infrastructure

- `searchVector` (tsvector + GIN index) already on bookmarks — full-text search is wired
- Previously had `conversations` + `messages` tables (migrations 0004-0006), dropped them (0007-0008)
- CLI (`scx`) working with auth + API keys
