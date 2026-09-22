CREATE TABLE `feature_usage_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`featureKey` varchar(60) NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feature_usage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(40) NOT NULL,
	`eventId` varchar(180) NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`payload` text NOT NULL,
	`signature` varchar(500),
	`processedAt` timestamp,
	`status` enum('received','processed','failed','ignored') NOT NULL DEFAULT 'received',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_events_provider_event_unique` UNIQUE(`provider`,`eventId`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int,
	`provider` varchar(40) NOT NULL,
	`providerPaymentId` varchar(180),
	`providerTransactionId` varchar(180),
	`amount` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'TRY',
	`status` enum('pending','authorized','paid','failed','refunded','partially_refunded','canceled') NOT NULL DEFAULT 'pending',
	`paymentType` varchar(40),
	`paidAt` timestamp,
	`failedAt` timestamp,
	`refundedAt` timestamp,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`adminId` int,
	`action` varchar(80) NOT NULL,
	`oldState` text,
	`newState` text,
	`reason` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`tier` enum('free','premium','premium_plus') NOT NULL DEFAULT 'free',
	`billingPeriod` enum('none','monthly','yearly') NOT NULL DEFAULT 'none',
	`price` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'TRY',
	`trialDays` int NOT NULL DEFAULT 0,
	`storeProductId` varchar(180),
	`provider` varchar(40),
	`isActive` int NOT NULL DEFAULT 1,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_plans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('trialing','active','past_due','grace_period','canceled','expired','paused','incomplete') NOT NULL DEFAULT 'active',
	`trialStartedAt` timestamp,
	`trialEndsAt` timestamp,
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`canceledAt` timestamp,
	`cancelAtPeriodEnd` int NOT NULL DEFAULT 0,
	`gracePeriodEndsAt` timestamp,
	`provider` varchar(40),
	`providerSubscriptionId` varchar(180),
	`providerCustomerId` varchar(180),
	`latestPaymentId` int,
	`isManualOverride` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `approvalStatus` enum('pending','approved','rejected') DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `rejectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `rejectionReason` varchar(300);--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','suspended','deleted') DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE INDEX `feature_usage_logs_user_feature_idx` ON `feature_usage_logs` (`userId`,`featureKey`,`usedAt`);--> statement-breakpoint
CREATE INDEX `payments_user_idx` ON `payments` (`userId`);--> statement-breakpoint
CREATE INDEX `payments_subscription_idx` ON `payments` (`subscriptionId`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `subscription_audit_logs_user_idx` ON `subscription_audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `subscription_audit_logs_created_at_idx` ON `subscription_audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_current_period_end_idx` ON `subscriptions` (`currentPeriodEnd`);--> statement-breakpoint
CREATE INDEX `subscriptions_provider_subscription_idx` ON `subscriptions` (`providerSubscriptionId`);