import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  json,
} from "drizzle-orm/pg-core";

import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const bookmarks = pgTable("bookmarks", {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  url: text().unique().notNull(),
  content: text().notNull(),
  author: text(),
  mediaUrls: json().$type<{ type: string; url: string }[]>(),
  createdAt: timestamp().defaultNow(),
  isRead: boolean().default(false),
});

export const bookmarksInsertSchema = createInsertSchema(bookmarks);
export const bookmarksSelectSchema = createSelectSchema(bookmarks);
