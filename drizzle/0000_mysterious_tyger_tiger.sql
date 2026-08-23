CREATE TABLE `issueAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `issueAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`reporterId` int NOT NULL,
	`assignedOfficerId` int,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`category` enum('Road Damage','Garbage','Street Light','Water Leakage','Drainage','Electricity','Illegal Parking','Noise','Environment','Animal Issues','Other') NOT NULL,
	`status` enum('Pending','In Progress','Resolved','Closed') NOT NULL DEFAULT 'Pending',
	`priority` enum('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
	`ward` varchar(120) NOT NULL,
	`locationName` varchar(255) NOT NULL,
	`latitude` varchar(32),
	`longitude` varchar(32),
	`resolutionNote` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `issues_id` PRIMARY KEY(`id`),
	CONSTRAINT `issues_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`issueId` int,
	`title` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`kind` varchar(64) NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('citizen','officer','admin') NOT NULL DEFAULT 'citizen',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
