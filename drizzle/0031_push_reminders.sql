CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` varchar(600) NOT NULL,
	`p256dh` varchar(200) NOT NULL,
	`auth` varchar(100) NOT NULL,
	`userAgent` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSentAt` timestamp,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscriptions_endpoint_idx` UNIQUE(`endpoint`)
);
--> statement-breakpoint
ALTER TABLE `study_plan_sessions` ADD `reminderSentAt` timestamp;--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`userId`);