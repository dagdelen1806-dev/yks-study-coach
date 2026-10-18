CREATE TABLE `organization_credit_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`userId` int NOT NULL,
	`featureKey` varchar(60) NOT NULL,
	`credits` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_credit_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `organization_members` ADD `kvkkVersion` int;--> statement-breakpoint
ALTER TABLE `organizations` ADD `plan` enum('trial','standard','pro') DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `membershipStartsAt` timestamp;--> statement-breakpoint
ALTER TABLE `organizations` ADD `membershipEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `organizations` ADD `aiCreditsMonthly` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `perStudentCreditCap` int;--> statement-breakpoint
ALTER TABLE `organizations` ADD `kvkkNotice` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `kvkkConsent` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `kvkkVersion` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `kvkkUpdatedAt` timestamp;--> statement-breakpoint
CREATE INDEX `organization_credit_usage_org_used_idx` ON `organization_credit_usage` (`orgId`,`usedAt`);--> statement-breakpoint
CREATE INDEX `organization_credit_usage_org_user_used_idx` ON `organization_credit_usage` (`orgId`,`userId`,`usedAt`);