/*
  Warnings:

  - A unique constraint covering the columns `[domain]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[subdomain]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `tenant` ADD COLUMN `domain` VARCHAR(191) NULL,
    ADD COLUMN `subdomain` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Announcement` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GlobalSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GlobalSetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Tenant_domain_key` ON `Tenant`(`domain`);

-- CreateIndex
CREATE UNIQUE INDEX `Tenant_subdomain_key` ON `Tenant`(`subdomain`);
