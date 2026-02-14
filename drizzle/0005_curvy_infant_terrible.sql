ALTER TABLE "bookmarks" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
CREATE INDEX "bookmarks_search_idx" ON "bookmarks" USING gin ("search_vector");