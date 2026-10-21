ALTER TABLE `notebook_questions` ADD `aiSolution` text;--> statement-breakpoint
ALTER TABLE `notebook_questions` ADD `aiSolutionAt` timestamp;--> statement-breakpoint
ALTER TABLE `question_attempts` ADD `hintLevel` int DEFAULT 0 NOT NULL;