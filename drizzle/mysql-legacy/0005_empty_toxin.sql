CREATE TABLE `study_plan_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`userId` int NOT NULL,
	`sessionDate` timestamp NOT NULL,
	`title` varchar(180) NOT NULL,
	`subject` varchar(80) NOT NULL,
	`topic` varchar(180) NOT NULL,
	`kind` varchar(40) NOT NULL,
	`plannedMinutes` int NOT NULL DEFAULT 0,
	`targetQuestions` int,
	`targetPages` varchar(80),
	`targetTests` varchar(80),
	`status` enum('planned','completed','skipped') NOT NULL DEFAULT 'planned',
	`completedAt` timestamp,
	`actualMinutes` int,
	`actualQuestions` int,
	`correct` int,
	`wrong` int,
	`blank` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_plan_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`weekStart` timestamp NOT NULL,
	`weekEnd` timestamp NOT NULL,
	`summary` text NOT NULL,
	`source` enum('ai','manual') NOT NULL DEFAULT 'ai',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `topic_study_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`subject` varchar(80) NOT NULL,
	`topic` varchar(180) NOT NULL,
	`studyDate` timestamp NOT NULL,
	`minutes` int NOT NULL DEFAULT 0,
	`questions` int NOT NULL DEFAULT 0,
	`correct` int NOT NULL DEFAULT 0,
	`wrong` int NOT NULL DEFAULT 0,
	`blank` int NOT NULL DEFAULT 0,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `topic_study_logs_id` PRIMARY KEY(`id`)
);
