CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"content" text NOT NULL,
	"author" text,
	"mediaUrls" json,
	"createdAt" timestamp DEFAULT now(),
	"isRead" boolean DEFAULT false,
	CONSTRAINT "bookmarks_url_unique" UNIQUE("url")
);
