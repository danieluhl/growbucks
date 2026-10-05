DROP TABLE `login_codes`;--> statement-breakpoint
DROP INDEX `members_email_unique`;--> statement-breakpoint
ALTER TABLE `members` ADD `apple_sub` text;--> statement-breakpoint
CREATE UNIQUE INDEX `members_apple_sub_unique` ON `members` (`apple_sub`);