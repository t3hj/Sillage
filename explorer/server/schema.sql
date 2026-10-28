CREATE TABLE `user_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL,
	`operation_id` text NOT NULL,
	`updated_at` text NOT NULL
);
