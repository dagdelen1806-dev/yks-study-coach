ALTER TABLE "student_profiles" ADD COLUMN "examTrack" text DEFAULT 'YKS' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "currentLgsNet" varchar(40);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "targetHighSchool" varchar(180);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "targetLgsScore" varchar(20);