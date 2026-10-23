CREATE TABLE "org_plan_prices" (
	"plan" varchar(20) PRIMARY KEY NOT NULL,
	"monthlyPriceTry" integer,
	"yearlyPriceTry" integer,
	"priceNote" varchar(160),
	"updatedByUserId" integer,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Supabase Data API'den erişilmesin (bkz. 0001_enable_rls.sql).
ALTER TABLE "org_plan_prices" ENABLE ROW LEVEL SECURITY;
