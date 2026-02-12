import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  json,
  primaryKey,
  real,
} from "drizzle-orm/pg-core";

import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const bookmarks = pgTable("bookmarks", {
  id: uuid().primaryKey().defaultRandom(),
  type: text().notNull().default("link"),
  title: text(),
  aiTitle: text(),
  url: text().unique().notNull(),
  content: text(),
  author: text(),
  mediaUrls: json().$type<{ type: string; url: string }[]>(),
  isRead: boolean().default(false),
  positionX: real().default(0),
  positionY: real().default(0),
  createdAt: timestamp().defaultNow(),
  createdBy: text().notNull(),
});

export const tags = pgTable("tags", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  color: text().notNull(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
  createdBy: text().notNull(),
});

export const bookmarkTags = pgTable(
  "bookmark_tags",
  {
    bookmarkId: uuid()
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.bookmarkId, table.tagId] })],
);

export const bookmarksInsertSchema = createInsertSchema(bookmarks);
export const bookmarksSelectSchema = createSelectSchema(bookmarks);
export const tagsInsertSchema = createInsertSchema(tags);
export const tagsSelectSchema = createSelectSchema(tags);
