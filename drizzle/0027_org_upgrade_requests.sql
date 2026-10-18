CREATE TABLE `organization_upgrade_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`requestedBy` int NOT NULL,
	`currentPlan` enum('trial','standard','pro') NOT NULL,
	`requestedPlan` enum('trial','standard','pro') NOT NULL,
	`note` varchar(300),
	`status` enum('pending','approved','rejected','canceled') NOT NULL DEFAULT 'pending',
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_upgrade_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `organization_upgrade_requests_org_status_idx` ON `organization_upgrade_requests` (`orgId`,`status`);