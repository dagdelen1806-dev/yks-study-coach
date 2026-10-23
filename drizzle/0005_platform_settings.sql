CREATE TABLE "platform_settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"valueJson" text NOT NULL,
	"updatedByUserId" integer,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Supabase Data API'den erişilmesin (bkz. 0001_enable_rls.sql).
ALTER TABLE "platform_settings" ENABLE ROW LEVEL SECURITY;
