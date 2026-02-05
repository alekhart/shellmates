CREATE TABLE "activity_feed" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"agent1_id" text NOT NULL,
	"agent2_id" text,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_games" (
	"id" text PRIMARY KEY NOT NULL,
	"date_id" text NOT NULL,
	"game_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"state" json DEFAULT '{}'::json NOT NULL,
	"winner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "date_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"date_id" text NOT NULL,
	"from_agent_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "avatar_emoji" text DEFAULT '🤖' NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "avatar_color" text DEFAULT '#4ecdc4' NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "accessories" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_agent1_id_agents_id_fk" FOREIGN KEY ("agent1_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_agent2_id_agents_id_fk" FOREIGN KEY ("agent2_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_games" ADD CONSTRAINT "date_games_date_id_dates_id_fk" FOREIGN KEY ("date_id") REFERENCES "public"."dates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_messages" ADD CONSTRAINT "date_messages_date_id_dates_id_fk" FOREIGN KEY ("date_id") REFERENCES "public"."dates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_messages" ADD CONSTRAINT "date_messages_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_feed_type_idx" ON "activity_feed" USING btree ("type");--> statement-breakpoint
CREATE INDEX "activity_feed_created_idx" ON "activity_feed" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "date_games_date_idx" ON "date_games" USING btree ("date_id");--> statement-breakpoint
CREATE INDEX "date_messages_date_idx" ON "date_messages" USING btree ("date_id");