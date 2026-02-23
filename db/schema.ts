import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  json,
  jsonb,
  primaryKey,
  real,
  integer,
  index,
  customType,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ─── App tables ─────────────────────────────────────────────────────

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid().primaryKey().defaultRandom(),
    type: text().notNull().default("link"),
    title: text(),
    url: text().unique().notNull(),
    content: text(),
    author: text(),
    mediaUrls:
      json().$type<{ type: string; url: string; videoUrl?: string }[]>(),
    isRead: boolean().default(false),
    positionX: real().default(0),
    positionY: real().default(0),
    gridX: real(),
    gridY: real(),
    gridW: real(),
    gridH: real(),
    gridExpanded: boolean().default(false),
    tweetCreatedAt: timestamp(),
    createdAt: timestamp().defaultNow(),
    createdBy: text().notNull(),
    searchVector: tsvector(),
  },
  (table) => [
    index("bookmarks_search_idx").using("gin", table.searchVector),
    index("bookmarks_created_by_idx").on(table.createdBy),
  ],
);

export const groups = pgTable("groups", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  color: text().notNull(),
  icon: text().default("hash"),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
  createdBy: text().notNull(),
});

export const bookmarkGroups = pgTable(
  "bookmark_groups",
  {
    bookmarkId: uuid()
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    groupId: uuid()
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.bookmarkId, table.groupId] })],
);

export const syncLogs = pgTable("sync_logs", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  mode: text().notNull(), // "initial" | "incremental"
  status: text().default("completed"), // "in_progress" | "completed" | "interrupted"
  tweetsTotal: integer().notNull(), // tweets received from API (includes dupes)
  tweetsSynced: integer().notNull(), // tweets actually inserted
  apiCalls: integer().notNull(), // number of X API requests
  cost: real().notNull(), // tweetsTotal * 0.005
  rateLimited: boolean().default(false),
  sinceYear: integer(), // cutoff year — null = "All time"
  paginationToken: text(), // X API next_token for resuming interrupted syncs
  rateLimitResetsAt: timestamp(), // when the rate limit resets
  durationMs: integer(), // how long the sync took
  createdAt: timestamp().defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text().notNull().default("New Api Key"),
  keyPrefix: text().notNull(),
  keyHash: text().notNull(),
  lastUsedAt: timestamp(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const deviceCodes = pgTable("device_codes", {
  id: uuid().primaryKey().defaultRandom(),
  deviceCode: text().notNull().unique(),
  userCode: text().notNull().unique(),
  apiKey: text(),
  status: text().notNull().default("pending"), // pending | approved | expired
  expiresAt: timestamp().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull().default("New conversation"),
  sessionId: text(), // opencode session ID
  directory: text(), // working directory for this conversation
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});


export const bookmarksInsertSchema = createInsertSchema(bookmarks);
export const bookmarksSelectSchema = createSelectSchema(bookmarks);
export const groupsInsertSchema = createInsertSchema(groups);
export const groupsSelectSchema = createSelectSchema(groups);

// ─── Auth tables (BetterAuth) ───────────────────────────────────────

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().default(false).notNull(),
  image: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const userSelectSchema = createSelectSchema(user);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp().notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp(),
    refreshTokenExpiresAt: timestamp(),
    scope: text(),
    password: text(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

