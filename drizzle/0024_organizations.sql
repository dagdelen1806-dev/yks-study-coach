CREATE TABLE `class_students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`studentUserId` int NOT NULL,
	CONSTRAINT `class_students_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_students_class_student_unique` UNIQUE(`classId`,`studentUserId`)
);
--> statement-breakpoint
CREATE TABLE `counseling_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`body` text NOT NULL,
	`visibility` enum('staff','student') NOT NULL DEFAULT 'staff',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `counseling_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(60) NOT NULL,
	`targetType` varchar(40),
	`targetId` int,
	`metadataJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`gradeLevel` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`role` enum('admin','coordinator','teacher','student') NOT NULL,
	`codeHash` varchar(64) NOT NULL,
	`note` varchar(160),
	`expiresAt` timestamp NOT NULL,
	`maxUses` int NOT NULL DEFAULT 1,
	`usedCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_invitations_codeHash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','coordinator','teacher','student') NOT NULL,
	`status` enum('active','left','removed') NOT NULL DEFAULT 'active',
	`consentAt` timestamp,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	`invitedBy` int,
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_members_org_user_unique` UNIQUE(`orgId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `teacher_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`teacherUserId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teacher_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `teacher_assignments_pair_unique` UNIQUE(`orgId`,`teacherUserId`,`studentUserId`)
);
--> statement-breakpoint
ALTER TABLE `study_plan_sessions` ADD `assignedByUserId` int;--> statement-breakpoint
ALTER TABLE `study_plan_sessions` ADD `assignedOrgId` int;--> statement-breakpoint
CREATE INDEX `counseling_notes_org_student_idx` ON `counseling_notes` (`orgId`,`studentUserId`);--> statement-breakpoint
CREATE INDEX `organization_audit_logs_org_created_idx` ON `organization_audit_logs` (`orgId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_classes_org_idx` ON `organization_classes` (`orgId`);--> statement-breakpoint
CREATE INDEX `organization_invitations_org_idx` ON `organization_invitations` (`orgId`);--> statement-breakpoint
CREATE INDEX `organization_members_user_status_idx` ON `organization_members` (`userId`,`status`);