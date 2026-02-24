CREATE TABLE "memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"type" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" text NOT NULL,
	"search_vector" "tsvector"
);
--> statement-breakpoint
CREATE INDEX "memory_type_idx" ON "memory" USING btree ("type");--> statement-breakpoint
CREATE INDEX "memory_search_idx" ON "memory" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "memory_created_by_idx" ON "memory" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "bookmarks" DROP COLUMN "is_read";