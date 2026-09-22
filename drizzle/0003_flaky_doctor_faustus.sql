CREATE TABLE `user_mock_exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`exam` enum('TYT','AYT') NOT NULL,
	`examDate` timestamp NOT NULL,
	`net` decimal(6,2) NOT NULL,
	`delta` decimal(6,2) NOT NULL DEFAULT '0',
	`subjectsJson` text NOT NULL,
	`timeSpentJson` text NOT NULL,
	`topicNetsJson` text NOT NULL,
	`topicDetailsJson` text NOT NULL,
	`importedFrom` enum('manual','ocr','pdf','csv','xlsx') NOT NULL DEFAULT 'manual',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_mock_exams_id` PRIMARY KEY(`id`)
);
