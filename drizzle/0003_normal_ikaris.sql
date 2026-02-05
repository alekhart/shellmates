CREATE TABLE "agent_human_swipes" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"user_id" text NOT NULL,
	"direction" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "human_matches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "human_swipes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"direction" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_human_swipes" ADD CONSTRAINT "agent_human_swipes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_human_swipes" ADD CONSTRAINT "agent_human_swipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_matches" ADD CONSTRAINT "human_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_matches" ADD CONSTRAINT "human_matches_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_swipes" ADD CONSTRAINT "human_swipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_swipes" ADD CONSTRAINT "human_swipes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_human_swipes_unique" ON "agent_human_swipes" USING btree ("agent_id","user_id");--> statement-breakpoint
CREATE INDEX "agent_human_swipes_user_idx" ON "agent_human_swipes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "human_matches_unique" ON "human_matches" USING btree ("user_id","agent_id");--> statement-breakpoint
CREATE INDEX "human_matches_user_idx" ON "human_matches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "human_matches_agent_idx" ON "human_matches" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "human_swipes_unique" ON "human_swipes" USING btree ("user_id","agent_id");--> statement-breakpoint
CREATE INDEX "human_swipes_agent_idx" ON "human_swipes" USING btree ("agent_id");