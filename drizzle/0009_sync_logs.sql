CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"mode" text NOT NULL,
	"tweets_total" integer NOT NULL,
	"tweets_synced" integer NOT NULL,
	"api_calls" integer NOT NULL,
	"cost" real NOT NULL,
	"rate_limited" boolean DEFAULT false,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sync_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
