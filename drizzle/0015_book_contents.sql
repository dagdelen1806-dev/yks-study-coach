CREATE TABLE `user_book_contents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` varchar(120) NOT NULL,
	`sortOrder` int NOT NULL,
	`unitNumber` int,
	`unitTitle` varchar(300) NOT NULL,
	`contentType` enum('topic_test','osym_type','review','simulation','topic') NOT NULL,
	`label` varchar(120) NOT NULL,
	`testNumber` int,
	`title` varchar(300) NOT NULL,
	`pageStart` int,
	`pageEnd` int,
	`topicId` int,
	`mappingStatus` enum('confirmed','unmatched','not_applicable') NOT NULL,
	`mappingMethod` enum('exact_topic','exact_alias','contains_topic','contains_alias','fuzzy','manual','none') NOT NULL DEFAULT 'none',
	`mappingConfidence` decimal(4,3) NOT NULL DEFAULT '0',
	`source` enum('ocr','manual') NOT NULL DEFAULT 'ocr',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_book_contents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `study_plan_sessions` ADD `sourceBookId` varchar(120);--> statement-breakpoint
CREATE INDEX `user_book_contents_user_book_idx` ON `user_book_contents` (`userId`,`bookId`);--> statement-breakpoint
CREATE INDEX `user_book_contents_user_topic_idx` ON `user_book_contents` (`userId`,`topicId`);