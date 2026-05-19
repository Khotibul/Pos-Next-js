-- CreateTable
CREATE TABLE `PurchaseOrder` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NULL,
    `orderNo` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `notes` VARCHAR(191) NULL,
    `subtotal` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `tax` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `total` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchaseOrder_tenantId_idx`(`tenantId`),
    INDEX `PurchaseOrder_createdAt_idx`(`createdAt`),
    INDEX `PurchaseOrder_status_idx`(`status`),
    UNIQUE INDEX `PurchaseOrder_tenantId_orderNo_key`(`tenantId`, `orderNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `costPrice` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `qty` INTEGER NOT NULL DEFAULT 1,
    `lineTotal` DECIMAL(65, 30) NOT NULL DEFAULT 0,

    INDEX `PurchaseOrderItem_tenantId_idx`(`tenantId`),
    INDEX `PurchaseOrderItem_purchaseOrderId_idx`(`purchaseOrderId`),
    INDEX `PurchaseOrderItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashierShift` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `cashierUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `openingCash` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `closingCash` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `note` VARCHAR(191) NULL,

    INDEX `CashierShift_tenantId_idx`(`tenantId`),
    INDEX `CashierShift_cashierUserId_idx`(`cashierUserId`),
    INDEX `CashierShift_openedAt_idx`(`openedAt`),
    INDEX `CashierShift_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashierShift` ADD CONSTRAINT `CashierShift_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashierShift` ADD CONSTRAINT `CashierShift_cashierUserId_fkey` FOREIGN KEY (`cashierUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
