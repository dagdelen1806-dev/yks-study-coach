ALTER TABLE "yks_topics" ADD COLUMN "hidden" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "yks_topics" ADD COLUMN "previousNames" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "yks_topics" ADD COLUMN "updatedAt" timestamp with time zone DEFAULT now() NOT NULL;