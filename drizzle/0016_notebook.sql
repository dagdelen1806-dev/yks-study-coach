CREATE TABLE `note_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`noteId` int,
	`kind` enum('image','audio') NOT NULL,
	`mimeType` varchar(60) NOT NULL,
	`byteSize` int NOT NULL,
	`data` mediumblob NOT NULL,
	`durationSec` int,
	`ocrText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `note_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `note_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`noteId` int NOT NULL,
	`userId` int NOT NULL,
	`tag` varchar(40) NOT NULL,
	CONSTRAINT `note_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `note_tags_note_tag_unique` UNIQUE(`noteId`,`tag`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(40) NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` mediumtext NOT NULL,
	`plainText` mediumtext NOT NULL,
	`stats` varchar(500) NOT NULL,
	`noteDate` timestamp NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`visibility` enum('private') NOT NULL DEFAULT 'private',
	`isFavorite` int NOT NULL DEFAULT 0,
	`isPinned` int NOT NULL DEFAULT 0,
	`reviewAt` timestamp,
	`templateKey` varchar(40),
	`subject` varchar(80),
	`topicId` int,
	`bookId` varchar(120),
	`bookContentId` int,
	`studySessionId` int,
	`mockExamId` int,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`),
	CONSTRAINT `notes_user_client_unique` UNIQUE(`userId`,`clientId`)
);
--> statement-breakpoint
CREATE INDEX `note_attachments_user_note_idx` ON `note_attachments` (`userId`,`noteId`);--> statement-breakpoint
CREATE INDEX `note_tags_user_tag_idx` ON `note_tags` (`userId`,`tag`);--> statement-breakpoint
CREATE INDEX `notes_user_date_idx` ON `notes` (`userId`,`noteDate`);--> statement-breakpoint
CREATE INDEX `notes_user_topic_idx` ON `notes` (`userId`,`topicId`);--> statement-breakpoint
CREATE INDEX `notes_user_book_idx` ON `notes` (`userId`,`bookId`);--> statement-breakpoint
CREATE INDEX `notes_user_session_idx` ON `notes` (`userId`,`studySessionId`);--> statement-breakpoint
CREATE INDEX `notes_user_review_idx` ON `notes` (`userId`,`reviewAt`);