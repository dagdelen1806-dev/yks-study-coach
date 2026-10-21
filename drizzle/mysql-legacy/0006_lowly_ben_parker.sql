ALTER TABLE `study_plan_sessions` ADD `rescheduledFrom` timestamp;--> statement-breakpoint
ALTER TABLE `study_plan_sessions` ADD `rescheduledAt` timestamp;--> statement-breakpoint
ALTER TABLE `study_plan_sessions` ADD `rescheduleCount` int DEFAULT 0 NOT NULL;