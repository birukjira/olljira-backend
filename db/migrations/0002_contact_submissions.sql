CREATE TABLE `contact_submissions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`contact` varchar(255) NOT NULL,
	`service` varchar(255),
	`message` text NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_submissions_id` PRIMARY KEY(`id`)
);
