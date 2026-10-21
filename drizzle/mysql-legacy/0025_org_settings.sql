ALTER TABLE `organization_classes` ADD `track` varchar(20);--> statement-breakpoint
ALTER TABLE `organization_classes` ADD `advisorUserId` int;--> statement-breakpoint
ALTER TABLE `organization_invitations` ADD `subject` varchar(60);--> statement-breakpoint
ALTER TABLE `organization_members` ADD `subject` varchar(60);--> statement-breakpoint
ALTER TABLE `organizations` ADD `kind` enum('dershane','okul','etut','kocluk','diger') DEFAULT 'dershane' NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `city` varchar(80);--> statement-breakpoint
ALTER TABLE `organizations` ADD `district` varchar(80);--> statement-breakpoint
ALTER TABLE `organizations` ADD `address` varchar(300);--> statement-breakpoint
ALTER TABLE `organizations` ADD `phone` varchar(40);--> statement-breakpoint
ALTER TABLE `organizations` ADD `contactEmail` varchar(160);