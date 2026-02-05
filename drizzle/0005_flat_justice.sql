CREATE TABLE "cosmetics" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"emoji_or_style" text NOT NULL,
	"price" integer NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sticker_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"sticker_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stickers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"category" text NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_cosmetics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cosmetic_id" text NOT NULL,
	"acquired_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stickers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"sticker_id" text NOT NULL,
	"acquired_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "coins" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "equipped_badge" text;--> statement-breakpoint
ALTER TABLE "sticker_messages" ADD CONSTRAINT "sticker_messages_match_id_human_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."human_matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticker_messages" ADD CONSTRAINT "sticker_messages_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticker_messages" ADD CONSTRAINT "sticker_messages_sticker_id_stickers_id_fk" FOREIGN KEY ("sticker_id") REFERENCES "public"."stickers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_cosmetic_id_cosmetics_id_fk" FOREIGN KEY ("cosmetic_id") REFERENCES "public"."cosmetics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stickers" ADD CONSTRAINT "user_stickers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stickers" ADD CONSTRAINT "user_stickers_sticker_id_stickers_id_fk" FOREIGN KEY ("sticker_id") REFERENCES "public"."stickers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sticker_messages_match_idx" ON "sticker_messages" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "sticker_messages_created_idx" ON "sticker_messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_cosmetics_unique" ON "user_cosmetics" USING btree ("user_id","cosmetic_id");--> statement-breakpoint
CREATE INDEX "user_cosmetics_user_idx" ON "user_cosmetics" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_stickers_unique" ON "user_stickers" USING btree ("user_id","sticker_id");--> statement-breakpoint
CREATE INDEX "user_stickers_user_idx" ON "user_stickers" USING btree ("user_id");