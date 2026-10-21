CREATE TABLE `app_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fingerprint` varchar(64) NOT NULL,
	`source` enum('client','server') NOT NULL,
	`message` varchar(500) NOT NULL,
	`stack` text,
	`path` varchar(300),
	`lastUserId` int,
	`userAgent` varchar(300),
	`count` int NOT NULL DEFAULT 1,
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `app_errors_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_errors_fingerprint_idx` UNIQUE(`fingerprint`)
);
--> statement-breakpoint
CREATE INDEX `app_errors_last_seen_idx` ON `app_errors` (`lastSeenAt`);