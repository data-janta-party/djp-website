CREATE TABLE `volunteers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`city` text NOT NULL,
	`interest` text NOT NULL,
	`created_at` text NOT NULL
);
