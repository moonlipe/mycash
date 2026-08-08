PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'checking' NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL,
	`initial_balance` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`color` text DEFAULT '#6b7280' NOT NULL,
	`icon` text DEFAULT 'tag' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer, `due_date` text, `recurrence_id` text, `installment_number` integer, `total_installments` integer, `notes` text, `reminder_date` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`user_id` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`file_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `reminder_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`user_id` text NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
DELETE FROM sqlite_sequence;
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`,`deleted_at`);
CREATE INDEX `categories_user_idx` ON `categories` (`user_id`,`type`);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE INDEX `users_email_idx` ON `users` (`email`);
CREATE INDEX `transactions_user_date_idx` ON `transactions` (`user_id`,`date`,`deleted_at`);
CREATE INDEX `transactions_recurrence_idx` ON `transactions` (`recurrence_id`);
CREATE INDEX `attachments_transaction_idx` ON `attachments` (`transaction_id`,`deleted_at`);
CREATE INDEX `attachments_user_idx` ON `attachments` (`user_id`);
CREATE INDEX `reminder_notifications_tx_idx` ON `reminder_notifications` (`transaction_id`);
CREATE INDEX `reminder_notifications_user_idx` ON `reminder_notifications` (`user_id`);
CREATE INDEX `transactions_reminder_idx` ON `transactions` (`reminder_date`,`deleted_at`);
