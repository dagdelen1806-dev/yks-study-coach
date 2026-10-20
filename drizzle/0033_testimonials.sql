CREATE TABLE `testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(60) NOT NULL,
	`detail` varchar(80),
	`rating` int NOT NULL,
	`body` varchar(600) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`reviewedBy` int,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`),
	CONSTRAINT `testimonials_user_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `testimonials_status_idx` ON `testimonials` (`status`,`updatedAt`);