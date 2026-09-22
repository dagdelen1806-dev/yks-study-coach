CREATE TABLE `book_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` varchar(120) NOT NULL,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	`removedAt` timestamp,
	CONSTRAINT `book_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `book_study_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` varchar(120) NOT NULL,
	`topic` varchar(180),
	`sessionDate` timestamp NOT NULL,
	`minutes` int NOT NULL DEFAULT 0,
	`questions` int NOT NULL DEFAULT 0,
	`correct` int NOT NULL DEFAULT 0,
	`wrong` int NOT NULL DEFAULT 0,
	`blank` int NOT NULL DEFAULT 0,
	`pageStart` int,
	`pageEnd` int,
	`testStart` int,
	`testEnd` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `book_study_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `book_topic_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` varchar(120) NOT NULL,
	`topic` varchar(180) NOT NULL,
	`subject` varchar(80) NOT NULL,
	`pageStart` int,
	`pageEnd` int,
	`testStart` int,
	`testEnd` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `book_topic_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_switches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromBookId` varchar(120),
	`toBookId` varchar(120) NOT NULL,
	`reason` varchar(300) NOT NULL,
	`switchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `source_switches_id` PRIMARY KEY(`id`)
);
