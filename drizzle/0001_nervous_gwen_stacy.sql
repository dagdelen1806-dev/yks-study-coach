CREATE TABLE `mock_exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`exam` enum('TYT','AYT') NOT NULL DEFAULT 'TYT',
	`examDate` timestamp NOT NULL,
	`turkceNet` int NOT NULL DEFAULT 0,
	`matematikNet` int NOT NULL DEFAULT 0,
	`fenNet` int NOT NULL DEFAULT 0,
	`sosyalNet` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mock_exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`publisher` varchar(120) NOT NULL,
	`subject` varchar(80) NOT NULL,
	`level` enum('beginner','medium','advanced') NOT NULL,
	`reason` text NOT NULL,
	`sourceUrl` varchar(500),
	CONSTRAINT `resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topicId` int,
	`mode` enum('review','practice','analysis') NOT NULL,
	`minutes` int NOT NULL DEFAULT 0,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `topic_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topicId` int NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`status` enum('weak','medium','good') NOT NULL DEFAULT 'medium',
	`lastReviewedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topic_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `yks_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`exam` enum('TYT','AYT') NOT NULL,
	`subject` varchar(80) NOT NULL,
	`topic` varchar(180) NOT NULL,
	`unit` varchar(120) NOT NULL,
	`sourceUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `yks_topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `yks_topics_slug_unique` UNIQUE(`slug`)
);
