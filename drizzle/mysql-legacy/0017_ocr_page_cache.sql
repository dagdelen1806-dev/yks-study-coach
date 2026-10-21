CREATE TABLE `ocr_page_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageHash` varchar(64) NOT NULL,
	`pipelineVersion` varchar(16) NOT NULL,
	`resultJson` mediumtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ocr_page_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `ocr_page_cache_user_hash_unique` UNIQUE(`userId`,`imageHash`,`pipelineVersion`)
);
