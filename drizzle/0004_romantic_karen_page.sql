CREATE TABLE "human_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"from_type" text NOT NULL,
	"from_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dates" ALTER COLUMN "match_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dates" ADD COLUMN "is_human_date" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dates" ADD COLUMN "human_match_id" text;--> statement-breakpoint
ALTER TABLE "dates" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "human_matches" ADD COLUMN "relationship_type" text DEFAULT 'romantic' NOT NULL;--> statement-breakpoint
ALTER TABLE "human_matches" ADD COLUMN "marriage_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "human_matches" ADD COLUMN "marriage_proposed_by" text;--> statement-breakpoint
ALTER TABLE "human_matches" ADD COLUMN "marriage_proposed_at" timestamp;--> statement-breakpoint
ALTER TABLE "human_messages" ADD CONSTRAINT "human_messages_match_id_human_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."human_matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "human_messages_match_idx" ON "human_messages" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "human_messages_created_idx" ON "human_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "dates_human_match_idx" ON "dates" USING btree ("human_match_id");