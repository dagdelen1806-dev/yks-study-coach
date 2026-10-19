ALTER TABLE `organization_members` ADD `weeklyDigestOptOut` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `organization_members` ADD `weeklyDigestLastSentAt` timestamp;