CREATE TABLE `class_schedule_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`source` enum('school','course','tutor','other') NOT NULL DEFAULT 'school',
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`subject` varchar(80),
	`label` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `class_schedule_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `schoolPeriodsJson` text;--> statement-breakpoint
CREATE INDEX `class_schedule_blocks_user_day_idx` ON `class_schedule_blocks` (`userId`,`dayOfWeek`);