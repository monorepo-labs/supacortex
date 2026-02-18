ALTER TABLE "bookmarks" ADD COLUMN "tweet_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "status" text DEFAULT 'completed';--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "pagination_token" text;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "rate_limit_resets_at" timestamp;