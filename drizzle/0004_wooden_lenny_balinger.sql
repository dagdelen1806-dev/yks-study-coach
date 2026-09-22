CREATE TABLE `user_resource_books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` varchar(120) NOT NULL,
	`title` varchar(180) NOT NULL,
	`publisher` varchar(120) NOT NULL,
	`subject` varchar(80) NOT NULL,
	`exam` enum('TYT','AYT') NOT NULL,
	`level` enum('Kolay','Orta','Zor') NOT NULL,
	`format` varchar(120) NOT NULL,
	`reason` text NOT NULL,
	`sourceUrl` varchar(500),
	`pageCount` int,
	`tone` varchar(20) NOT NULL DEFAULT 'blue',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_resource_books_id` PRIMARY KEY(`id`)
);
