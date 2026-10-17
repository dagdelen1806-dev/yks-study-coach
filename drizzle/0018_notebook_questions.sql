CREATE TABLE `notebook_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`noteId` int NOT NULL,
	`subject` varchar(80),
	`topicId` int,
	`questionImageId` int,
	`solutionImageId` int,
	`voiceAttachmentId` int,
	`voiceDuration` int,
	`stuckPoint` text,
	`solutionText` text,
	`errorType` varchar(30),
	`errorTypeSource` enum('student','ai'),
	`difficulty` enum('easy','medium','hard'),
	`aiTopicId` int,
	`status` enum('unsolved','learning','mastered') NOT NULL DEFAULT 'unsolved',
	`reviewStage` int NOT NULL DEFAULT 0,
	`nextReviewAt` timestamp,
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastResult` enum('solved','partial','failed'),
	`lastAttemptAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notebook_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `notebook_questions_note_unique` UNIQUE(`noteId`)
);
--> statement-breakpoint
CREATE TABLE `question_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`result` enum('solved','partial','failed') NOT NULL,
	`sawSolution` int NOT NULL DEFAULT 0,
	`seconds` int,
	`stageBefore` int NOT NULL,
	`attemptedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notebook_questions_user_review_idx` ON `notebook_questions` (`userId`,`nextReviewAt`);--> statement-breakpoint
CREATE INDEX `notebook_questions_user_topic_idx` ON `notebook_questions` (`userId`,`topicId`);--> statement-breakpoint
CREATE INDEX `question_attempts_user_question_idx` ON `question_attempts` (`userId`,`questionId`);