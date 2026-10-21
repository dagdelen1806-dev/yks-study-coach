CREATE TABLE `coach_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportId` int,
	`level` enum('info','success','warning','action') NOT NULL,
	`ruleKey` varchar(80) NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`actionLabel` varchar(120),
	`actionJson` text,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coach_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_adherence_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodType` enum('day','week','month') NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`overallScore` int NOT NULL DEFAULT 0,
	`sessionScore` int NOT NULL DEFAULT 0,
	`timeScore` int NOT NULL DEFAULT 0,
	`questionScore` int NOT NULL DEFAULT 0,
	`punctualityScore` int NOT NULL DEFAULT 0,
	`plannedSessions` int NOT NULL DEFAULT 0,
	`completedSessions` int NOT NULL DEFAULT 0,
	`plannedMinutes` int NOT NULL DEFAULT 0,
	`actualMinutes` int NOT NULL DEFAULT 0,
	`targetQuestions` int NOT NULL DEFAULT 0,
	`actualQuestions` int NOT NULL DEFAULT 0,
	`rescheduledSessions` int NOT NULL DEFAULT 0,
	`summary` text NOT NULL,
	`decision` varchar(80) NOT NULL,
	`snapshotJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plan_adherence_reports_id` PRIMARY KEY(`id`)
);
