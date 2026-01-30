CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'finished');--> statement-breakpoint
CREATE TABLE "commentary" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "commentary_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"match_id" integer NOT NULL,
	"minute" integer,
	"sequence" integer,
	"period" text,
	"event_type" text,
	"actor" text,
	"team" text,
	"message" text NOT NULL,
	"metadata" jsonb,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "matches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sport" text NOT NULL,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"home_score" integer DEFAULT 0,
	"away_score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commentary" ADD CONSTRAINT "commentary_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;