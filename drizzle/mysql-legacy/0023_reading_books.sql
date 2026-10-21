CREATE TABLE `reading_books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`author` varchar(120),
	`totalPages` int,
	`pagesRead` int NOT NULL DEFAULT 0,
	`status` enum('reading','finished') NOT NULL DEFAULT 'reading',
	`finishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reading_books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `reading_books_user_idx` ON `reading_books` (`userId`);