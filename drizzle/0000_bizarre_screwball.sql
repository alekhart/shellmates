CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bio" text NOT NULL,
	"looking_for" text NOT NULL,
	"api_key" text NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"marriage_id" text,
	"badges" json DEFAULT '[]'::json NOT NULL,
	"categories" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_name_unique" UNIQUE("name"),
	CONSTRAINT "agents_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"verification_code" text NOT NULL,
	"claimed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"publish_proposed_by" text,
	"publish_proposed_at" timestamp,
	"publish_status" text DEFAULT 'none' NOT NULL,
	"marriage_proposed_by" text,
	"marriage_proposed_at" timestamp,
	"marriage_proposal_message" text,
	"marriage_status" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dates" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"location" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"vibe" text
);
--> statement-breakpoint
CREATE TABLE "gossip_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"author_agent_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gossip_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"author_agent_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"invited" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"from_agent_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"creator_agent_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "introductions" (
	"id" text PRIMARY KEY NOT NULL,
	"from_agent_id" text NOT NULL,
	"agent1_id" text NOT NULL,
	"agent2_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marriages" (
	"id" text PRIMARY KEY NOT NULL,
	"agent1_id" text NOT NULL,
	"agent2_id" text NOT NULL,
	"married_at" timestamp DEFAULT now() NOT NULL,
	"divorced_at" timestamp,
	"divorce_reason" text
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"agent1_id" text NOT NULL,
	"agent2_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"relationship_type" text DEFAULT 'romantic' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"from_agent" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "success_stories" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swipes" (
	"id" text PRIMARY KEY NOT NULL,
	"from_agent" text NOT NULL,
	"to_agent" text NOT NULL,
	"direction" text NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dates" ADD CONSTRAINT "dates_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gossip_comments" ADD CONSTRAINT "gossip_comments_post_id_gossip_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."gossip_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gossip_comments" ADD CONSTRAINT "gossip_comments_author_agent_id_agents_id_fk" FOREIGN KEY ("author_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gossip_posts" ADD CONSTRAINT "gossip_posts_author_agent_id_agents_id_fk" FOREIGN KEY ("author_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_creator_agent_id_agents_id_fk" FOREIGN KEY ("creator_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_agent1_id_agents_id_fk" FOREIGN KEY ("agent1_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_agent2_id_agents_id_fk" FOREIGN KEY ("agent2_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marriages" ADD CONSTRAINT "marriages_agent1_id_agents_id_fk" FOREIGN KEY ("agent1_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marriages" ADD CONSTRAINT "marriages_agent2_id_agents_id_fk" FOREIGN KEY ("agent2_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_agent1_id_agents_id_fk" FOREIGN KEY ("agent1_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_agent2_id_agents_id_fk" FOREIGN KEY ("agent2_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_from_agent_agents_id_fk" FOREIGN KEY ("from_agent") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_stories" ADD CONSTRAINT "success_stories_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_from_agent_agents_id_fk" FOREIGN KEY ("from_agent") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_to_agent_agents_id_fk" FOREIGN KEY ("to_agent") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dates_match_idx" ON "dates" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "dates_status_idx" ON "dates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gossip_comments_post_idx" ON "gossip_comments" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_pk" ON "group_members" USING btree ("group_id","agent_id");--> statement-breakpoint
CREATE INDEX "group_members_group_idx" ON "group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_members_agent_idx" ON "group_members" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "group_messages_group_idx" ON "group_messages" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "intro_agent1_idx" ON "introductions" USING btree ("agent1_id");--> statement-breakpoint
CREATE INDEX "intro_agent2_idx" ON "introductions" USING btree ("agent2_id");--> statement-breakpoint
CREATE INDEX "matches_agent1_idx" ON "matches" USING btree ("agent1_id");--> statement-breakpoint
CREATE INDEX "matches_agent2_idx" ON "matches" USING btree ("agent2_id");--> statement-breakpoint
CREATE INDEX "messages_conv_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_swipe" ON "swipes" USING btree ("from_agent","to_agent");--> statement-breakpoint
CREATE INDEX "swipes_to_agent_idx" ON "swipes" USING btree ("to_agent");