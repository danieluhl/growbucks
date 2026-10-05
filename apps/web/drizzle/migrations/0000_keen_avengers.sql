CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`kid_id` text NOT NULL,
	`cadence` text DEFAULT 'daily' NOT NULL,
	`min_rate_ppm` integer DEFAULT 1000 NOT NULL,
	`max_rate_ppm` integer DEFAULT 2000 NOT NULL,
	`boost_x100` integer DEFAULT 200 NOT NULL,
	`auto_split_rate` integer DEFAULT true NOT NULL,
	`weekly_allowance_cents` integer DEFAULT 0 NOT NULL,
	`payday` integer DEFAULT 6 NOT NULL,
	`accrued_micro_cents` integer DEFAULT 0 NOT NULL,
	`last_processed_on` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`kid_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_kid_id_unique` ON `accounts` (`kid_id`);--> statement-breakpoint
CREATE TABLE `boosts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`x100` integer NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text NOT NULL,
	`reason` text,
	`created_by_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `boosts_account_idx` ON `boosts` (`account_id`,`ends_on`);--> statement-breakpoint
CREATE TABLE `completions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`task_id` text,
	`set_id` text,
	`on_date` text NOT NULL,
	`reward_kind` text NOT NULL,
	`reward_cents` integer DEFAULT 0 NOT NULL,
	`reward_rate_ppm` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`reviewed_at` integer,
	`reviewed_by_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`set_id`) REFERENCES `task_sets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `completions_account_day_idx` ON `completions` (`account_id`,`on_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `completions_task_day_uq` ON `completions` (`task_id`,`on_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `completions_set_day_uq` ON `completions` (`set_id`,`on_date`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`model` text,
	`expo_push_token` text,
	`last_seen_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `devices_family_idx` ON `devices` (`family_id`);--> statement-breakpoint
CREATE TABLE `families` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_codes_email_idx` ON `login_codes` (`email`,`created_at`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`avatar` text,
	`pin_hash` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE INDEX `members_family_idx` ON `members` (`family_id`);--> statement-breakpoint
CREATE TABLE `pairing_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`family_id` text NOT NULL,
	`kid_id` text NOT NULL,
	`created_by_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`used_by_device_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kid_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`used_by_device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pairing_codes_code_hash_unique` ON `pairing_codes` (`code_hash`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`kid_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`pitch` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`decided_by_id` text,
	`decided_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`kid_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decided_by_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `proposals_kid_idx` ON `proposals` (`kid_id`,`status`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`member_id` text NOT NULL,
	`device_id` text NOT NULL,
	`kind` text NOT NULL,
	`last_seen_at` integer,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_member_idx` ON `sessions` (`member_id`);--> statement-breakpoint
CREATE INDEX `sessions_device_idx` ON `sessions` (`device_id`);--> statement-breakpoint
CREATE TABLE `task_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`title` text NOT NULL,
	`scope` text DEFAULT 'custom' NOT NULL,
	`bonus_kind` text DEFAULT 'none' NOT NULL,
	`bonus_cents` integer DEFAULT 0 NOT NULL,
	`bonus_rate_ppm` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_sets_account_idx` ON `task_sets` (`account_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`title` text NOT NULL,
	`emoji` text,
	`schedule` text DEFAULT 'daily' NOT NULL,
	`reward_kind` text DEFAULT 'rate' NOT NULL,
	`reward_cents` integer DEFAULT 0 NOT NULL,
	`reward_rate_ppm` integer DEFAULT 0 NOT NULL,
	`set_id` text,
	`check_mode` text DEFAULT 'trust' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`proposed_by_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`set_id`) REFERENCES `task_sets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`proposed_by_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tasks_account_idx` ON `tasks` (`account_id`,`status`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`memo` text,
	`completion_id` text,
	`created_by_id` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`account_id`,`occurred_at`);