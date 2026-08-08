CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
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
--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY NOT NULL,
	`transaction_id` integer NOT NULL,
	`user_id` integer NOT NULL,
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
--> statement-breakpoint
CREATE INDEX `attachments_transaction_idx` ON `attachments` (`transaction_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `attachments_user_idx` ON `attachments` (`user_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`color` text DEFAULT '#6b7280' NOT NULL,
	`icon` text DEFAULT 'tag' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `categories_user_idx` ON `categories` (`user_id`,`type`);--> statement-breakpoint
CREATE TABLE `reminder_notifications` (
	`id` integer PRIMARY KEY NOT NULL,
	`transaction_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminder_notifications_tx_idx` ON `reminder_notifications` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `reminder_notifications_user_idx` ON `reminder_notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`due_date` text,
	`type` text NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`recurrence_id` integer,
	`installment_number` integer,
	`total_installments` integer,
	`notes` text,
	`reminder_date` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transactions_user_date_idx` ON `transactions` (`user_id`,`date`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `transactions_recurrence_idx` ON `transactions` (`recurrence_id`);--> statement-breakpoint
CREATE INDEX `transactions_reminder_idx` ON `transactions` (`reminder_date`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);