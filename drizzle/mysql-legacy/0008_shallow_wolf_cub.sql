CREATE TABLE `book_curriculum_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`topicId` int NOT NULL,
	`mappingMethod` enum('rule','ai','manual') NOT NULL DEFAULT 'rule',
	`confidence` decimal(4,3) NOT NULL DEFAULT '0',
	`isVerified` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `book_curriculum_topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `book_curriculum_topics_book_topic_unique` UNIQUE(`bookId`,`topicId`)
);
--> statement-breakpoint
CREATE TABLE `book_offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`source` varchar(60) NOT NULL,
	`price` decimal(10,2),
	`currency` varchar(8) NOT NULL DEFAULT 'TRY',
	`stockStatus` enum('in_stock','out_of_stock','unknown') NOT NULL DEFAULT 'unknown',
	`productUrl` varchar(500),
	`affiliateUrl` varchar(500),
	`affiliateEnabled` int NOT NULL DEFAULT 0,
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `book_offers_id` PRIMARY KEY(`id`),
	CONSTRAINT `book_offers_book_source_unique` UNIQUE(`bookId`,`source`)
);
--> statement-breakpoint
CREATE TABLE `catalog_books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publisherId` int,
	`name` varchar(300) NOT NULL,
	`slug` varchar(320) NOT NULL,
	`isbn` varchar(32),
	`editionYear` int,
	`description` text,
	`imageUrl` varchar(500),
	`bookType` enum('question_bank','topic_explanation','topic_explanation_question_bank','mock_exam','fasikul','past_questions','camp','test_book','reference','other') NOT NULL DEFAULT 'other',
	`examScope` enum('TYT','AYT','TYT_AYT','YKS','GENEL') NOT NULL DEFAULT 'GENEL',
	`subject` varchar(80),
	`difficultyScore` int NOT NULL DEFAULT 50,
	`difficultyLabel` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`difficultyConfidence` decimal(4,3) NOT NULL DEFAULT '0',
	`classificationMethod` enum('rule','ai','hybrid','manual') NOT NULL DEFAULT 'rule',
	`manualOverride` int NOT NULL DEFAULT 0,
	`needsReview` int NOT NULL DEFAULT 0,
	`classifiedAt` timestamp,
	`active` int NOT NULL DEFAULT 1,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_books_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_books_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `external_book_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(60) NOT NULL,
	`sourceProductId` varchar(160) NOT NULL,
	`sourceUrl` varchar(500),
	`rawName` varchar(320),
	`rawDescription` text,
	`rawPrice` decimal(10,2),
	`rawCurrency` varchar(8) DEFAULT 'TRY',
	`rawImageUrl` varchar(500),
	`rawPublisher` varchar(200),
	`rawCategory` varchar(200),
	`rawIsbn` varchar(32),
	`rawMetadata` text,
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSyncedAt` timestamp,
	`syncStatus` enum('pending','processed','needs_review','failed') NOT NULL DEFAULT 'pending',
	`matchedBookId` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `external_book_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `external_book_sources_source_product_unique` UNIQUE(`source`,`sourceProductId`)
);
--> statement-breakpoint
CREATE TABLE `publishers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`normalizedName` varchar(200) NOT NULL,
	`logoUrl` varchar(500),
	`websiteUrl` varchar(500),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `publishers_id` PRIMARY KEY(`id`),
	CONSTRAINT `publishers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `resource_catalog_sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(60) NOT NULL,
	`startedAt` timestamp NOT NULL,
	`finishedAt` timestamp,
	`dryRun` int NOT NULL DEFAULT 0,
	`fetched` int NOT NULL DEFAULT 0,
	`created` int NOT NULL DEFAULT 0,
	`updated` int NOT NULL DEFAULT 0,
	`skipped` int NOT NULL DEFAULT 0,
	`failed` int NOT NULL DEFAULT 0,
	`needsReview` int NOT NULL DEFAULT 0,
	`statsJson` text,
	`errorLog` text,
	`triggeredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resource_catalog_sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `book_curriculum_topics_topic_idx` ON `book_curriculum_topics` (`topicId`);--> statement-breakpoint
CREATE INDEX `book_offers_book_idx` ON `book_offers` (`bookId`);--> statement-breakpoint
CREATE INDEX `catalog_books_publisher_idx` ON `catalog_books` (`publisherId`);--> statement-breakpoint
CREATE INDEX `catalog_books_isbn_idx` ON `catalog_books` (`isbn`);--> statement-breakpoint
CREATE INDEX `catalog_books_book_type_idx` ON `catalog_books` (`bookType`);--> statement-breakpoint
CREATE INDEX `catalog_books_exam_scope_idx` ON `catalog_books` (`examScope`);--> statement-breakpoint
CREATE INDEX `catalog_books_subject_idx` ON `catalog_books` (`subject`);--> statement-breakpoint
CREATE INDEX `catalog_books_difficulty_label_idx` ON `catalog_books` (`difficultyLabel`);--> statement-breakpoint
CREATE INDEX `catalog_books_active_idx` ON `catalog_books` (`active`);--> statement-breakpoint
CREATE INDEX `catalog_books_needs_review_idx` ON `catalog_books` (`needsReview`);--> statement-breakpoint
CREATE INDEX `catalog_books_created_at_idx` ON `catalog_books` (`createdAt`);--> statement-breakpoint
CREATE INDEX `external_book_sources_sync_status_idx` ON `external_book_sources` (`syncStatus`);--> statement-breakpoint
CREATE INDEX `external_book_sources_matched_book_idx` ON `external_book_sources` (`matchedBookId`);--> statement-breakpoint
CREATE INDEX `external_book_sources_raw_isbn_idx` ON `external_book_sources` (`rawIsbn`);--> statement-breakpoint
CREATE INDEX `publishers_normalized_name_idx` ON `publishers` (`normalizedName`);--> statement-breakpoint
CREATE INDEX `resource_catalog_sync_logs_source_idx` ON `resource_catalog_sync_logs` (`source`);--> statement-breakpoint
CREATE INDEX `resource_catalog_sync_logs_started_at_idx` ON `resource_catalog_sync_logs` (`startedAt`);