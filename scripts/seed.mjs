import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Password123!";
const seedPassword = process.env.SEED_PASSWORD?.trim() || DEFAULT_PASSWORD;

const TAX_RATE = 0.11;

const roles = ["OWNER", "ADMIN", "CASHIER", "WAREHOUSE", "ACCOUNTANT", "BRANCH_MANAGER"];
const permissions = [
  { key: "dashboard.read", name: "Read dashboard" },
  { key: "sales.read", name: "Read sales/transactions" },
  { key: "sales.write", name: "Create sales/transactions" },
  { key: "sales.delete", name: "Delete sales/transactions" },
  { key: "transactions.shift.read", name: "Read shiftbook" },
  { key: "transactions.shift.open", name: "Open shift" },
  { key: "transactions.shift.close", name: "Close shift" },
  { key: "transactions.shift.approve", name: "Approve shift" },
  { key: "transactions.shift.export", name: "Export shift reports" },
  { key: "products.read", name: "Read products" },
  { key: "products.write", name: "Create/update products" },
  { key: "products.delete", name: "Delete products" },
  { key: "products.export", name: "Export products (CSV/Excel/PDF)" },
  { key: "products.import", name: "Import products (CSV/Excel)" },
  { key: "products.transfer", name: "Transfer stock between warehouses/branches" },
  { key: "products.opname", name: "Stock opname / cycle count" },
  { key: "products.adjustment", name: "Stock adjustment" },
  { key: "products.price.manage", name: "Manage product prices (branch/wholesale/member)" },
  { key: "products.discount.manage", name: "Manage product discounts/promos" },
  { key: "products.analytics.read", name: "Read product analytics" },
  { key: "products.ai.read", name: "Read AI product recommendations" },
  { key: "products.barcode.read", name: "Read barcode/label tools" },
  { key: "products.barcode.generate", name: "Generate product barcodes/QR codes" },
  { key: "products.barcode.print", name: "Print/export barcode labels" },
  { key: "products.expired.read", name: "Read expired/batch reports" },
  { key: "products.expired.update", name: "Update product batches/expired date" },
  { key: "products.ocr.scan", name: "Scan expired date from photo (OCR)" },
  { key: "branches.read", name: "Read branches" },
  { key: "branches.write", name: "Create/update branches" },
  { key: "branches.delete", name: "Delete branches" },
  { key: "staff.read", name: "Read staff/users" },
  { key: "staff.write", name: "Create/update staff/users" },
  { key: "staff.delete", name: "Delete staff/users" },
  { key: "customers.read", name: "Read customers" },
  { key: "customers.write", name: "Create/update customers" },
  { key: "customers.delete", name: "Delete customers" },
  { key: "suppliers.read", name: "Read suppliers" },
  { key: "suppliers.write", name: "Create/update suppliers" },
  { key: "suppliers.delete", name: "Delete suppliers" },
  { key: "inventory.read", name: "Read inventory" },
  { key: "inventory.write", name: "Create/update inventory" },
  { key: "inventory.delete", name: "Delete inventory" },
  { key: "reports.read", name: "Read reports" },
  { key: "settings.read", name: "Read settings" },
  { key: "settings.write", name: "Update settings" },
  { key: "billing.read", name: "Read billing" },
  { key: "printer.read", name: "Read printers" },
  { key: "printer.create", name: "Create printers" },
  { key: "printer.update", name: "Update printers" },
  { key: "printer.delete", name: "Delete printers" },
  { key: "printer.test", name: "Test printers" },
  { key: "printer.print", name: "Print receipts" },
];

const rolePermissionMatrix = {
  OWNER: [
    "dashboard.read",
    "sales.read",
    "sales.write",
    "sales.delete",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
    "transactions.shift.approve",
    "transactions.shift.export",
    "products.read",
    "products.write",
    "products.delete",
    "products.export",
    "products.import",
    "products.transfer",
    "products.opname",
    "products.adjustment",
    "products.price.manage",
    "products.discount.manage",
    "products.analytics.read",
    "products.ai.read",
    "products.barcode.read",
    "products.barcode.generate",
    "products.barcode.print",
    "products.expired.read",
    "products.expired.update",
    "products.ocr.scan",
    "branches.read",
    "branches.write",
    "branches.delete",
    "staff.read",
    "staff.write",
    "staff.delete",
    "customers.read",
    "customers.write",
    "customers.delete",
    "suppliers.read",
    "suppliers.write",
    "suppliers.delete",
    "inventory.read",
    "inventory.write",
    "inventory.delete",
    "reports.read",
    "settings.read",
    "settings.write",
    "billing.read",
    "printer.read",
    "printer.create",
    "printer.update",
    "printer.delete",
    "printer.test",
    "printer.print",
  ],
  ADMIN: [
    "dashboard.read",
    "sales.read",
    "sales.write",
    "sales.delete",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
    "transactions.shift.approve",
    "transactions.shift.export",
    "products.read",
    "products.write",
    "products.delete",
    "products.export",
    "products.import",
    "products.transfer",
    "products.opname",
    "products.adjustment",
    "products.price.manage",
    "products.discount.manage",
    "products.analytics.read",
    "products.ai.read",
    "products.barcode.read",
    "products.barcode.generate",
    "products.barcode.print",
    "products.expired.read",
    "products.expired.update",
    "products.ocr.scan",
    "branches.read",
    "branches.write",
    "branches.delete",
    "staff.read",
    "staff.write",
    "staff.delete",
    "customers.read",
    "customers.write",
    "customers.delete",
    "suppliers.read",
    "suppliers.write",
    "suppliers.delete",
    "inventory.read",
    "inventory.write",
    "inventory.delete",
    "reports.read",
    "settings.read",
    "settings.write",
    "billing.read",
    "printer.read",
    "printer.create",
    "printer.update",
    "printer.delete",
    "printer.test",
    "printer.print",
  ],
  CASHIER: [
    "dashboard.read",
    "sales.read",
    "sales.write",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
    "products.read",
    "customers.read",
  ],
  WAREHOUSE: [
    "dashboard.read",
    "branches.read",
    "products.read",
    "products.write",
    "products.transfer",
    "products.opname",
    "products.adjustment",
    "products.barcode.read",
    "products.barcode.generate",
    "products.barcode.print",
    "products.expired.read",
    "products.expired.update",
    "products.ocr.scan",
    "inventory.read",
    "inventory.write",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
  ],
  // Warehouse staff commonly handles stock movements.
  // Keep inventory perms for future inventory module parity.

  ACCOUNTANT: [
    "dashboard.read",
    "branches.read",
    "sales.read",
    "reports.read",
    "products.read",
    "products.analytics.read",
    "customers.read",
    "suppliers.read",
    "billing.read",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
    "transactions.shift.export",
  ],
  BRANCH_MANAGER: [
    "dashboard.read",
    "sales.read",
    "sales.write",
    "transactions.shift.read",
    "transactions.shift.open",
    "transactions.shift.close",
    "transactions.shift.approve",
    "transactions.shift.export",
    "branches.read",
    "products.read",
    "products.write",
    "products.export",
    "products.transfer",
    "products.opname",
    "products.adjustment",
    "products.price.manage",
    "products.discount.manage",
    "products.analytics.read",
    "products.ai.read",
    "products.barcode.read",
    "products.barcode.generate",
    "products.barcode.print",
    "products.expired.read",
    "products.expired.update",
    "products.ocr.scan",
    "customers.read",
    "customers.write",
    "suppliers.read",
    "suppliers.write",
    "inventory.read",
    "inventory.write",
    "reports.read",
    "settings.read",
    "printer.read",
    "printer.create",
    "printer.update",
    "printer.delete",
    "printer.test",
    "printer.print",
  ],
};

const DEFAULT_PRINTER_SETTINGS = {
  connectionType: "browser",
  bluetoothDeviceName: "",
  defaultBrowserPrinter: "",
  paper: "80mm",
  customWidthMm: 58,
  customHeightMm: 150,
  printWidthAdjustmentPx: 0,
  receiptMode: "standard",
  autoPrintAfterPayment: false,
  showLogo: false,
  headerTitle: "POS Pro",
  headerSubtitle: "",
  footerNote: "Terima kasih sudah berbelanja.",
  showTax: true,
  showDiscount: true,
  showSkuOnReceipt: true,
  showUnitPriceOnReceipt: true,
  cartShowSku: true,
  cartShowStock: true,
  cartShowDiscount: true,
  cartShowTax: true,
  receiptFontSize: "medium",
};

const productSeeds = [
  { sku: "SKU-0001", name: "Cheeseburger Deluxe", barcode: "899000000001", category: "Food", unit: "pcs", costPrice: 25000, sellingPrice: 45000, minStock: 10, wholesalePrice: 42000, wholesaleMinQty: 10, isFeatured: true },
  { sku: "SKU-0002", name: "Caramel Latte", barcode: "899000000002", category: "Drink", unit: "cup", costPrice: 14000, sellingPrice: 32000, minStock: 20, wholesalePrice: 30000, wholesaleMinQty: 20 },
  { sku: "SKU-0003", name: "Wireless Headphone", barcode: "899000000003", category: "Electronics", unit: "box", costPrice: 600000, sellingPrice: 850000, minStock: 5, wholesalePrice: 800000, wholesaleMinQty: 5, isFeatured: true },
  { sku: "SKU-0004", name: "French Fries Large", barcode: "899000000004", category: "Snack", unit: "pack", costPrice: 12000, sellingPrice: 20000, minStock: 15, wholesalePrice: 18500, wholesaleMinQty: 15 },
  { sku: "SKU-0005", name: "Iced Lemon Tea", barcode: "899000000005", category: "Drink", unit: "cup", costPrice: 6000, sellingPrice: 15000, minStock: 25, wholesalePrice: 13000, wholesaleMinQty: 25 },
  { sku: "SKU-0006", name: "Kopi Susu Gula Aren", barcode: "899000000006", category: "Drink", unit: "cup", costPrice: 10000, sellingPrice: 25000, minStock: 20, wholesalePrice: 23000, wholesaleMinQty: 20, type: "VARIANT" },
  { sku: "SKU-0007", name: "Susu UHT 1L", barcode: "899000000007", category: "Drink", unit: "pack", costPrice: 18000, sellingPrice: 28000, minStock: 30, wholesalePrice: 26000, wholesaleMinQty: 24, trackBatch: true },
  { sku: "SKU-0008", name: "Kentang Goreng Crispy", barcode: "899000000008", category: "Snack", unit: "pack", costPrice: 9000, sellingPrice: 18000, minStock: 20, wholesalePrice: 16000, wholesaleMinQty: 20 },
  { sku: "SKU-0009", name: "Shampoo Herbal 100ml", barcode: "899000000009", category: "Hygiene", unit: "pcs", costPrice: 15000, sellingPrice: 29000, minStock: 15, wholesalePrice: 27000, wholesaleMinQty: 12 },
  { sku: "SKU-0010", name: "Nasi Goreng Spesial", barcode: "899000000010", category: "Food", unit: "pcs", costPrice: 18000, sellingPrice: 38000, minStock: 10, wholesalePrice: 35000, wholesaleMinQty: 10 },
  { sku: "SKU-0011", name: "Paket Hemat Burger + Kentang", barcode: "899000000011", category: "Food", unit: "pack", costPrice: 35000, sellingPrice: 60000, minStock: 5, wholesalePrice: 55000, wholesaleMinQty: 5, type: "BUNDLE", isFeatured: true },
];

const PAY_METHODS = ["CASH", "CASH", "CASH", "QRIS", "TRANSFER", "EWALLET"];

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function inv(prefix = "TRX") {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${y}${m}${day}-${rand}`;
}

function poNo(seq) {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `PO-${y}${m}-${String(seq).padStart(4, "0")}`;
}

async function assertSchemaReady() {
  // Provide an actionable error if the database hasn't applied the latest migrations yet.
  const productCols = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Product'
      AND column_name IN ('qrCode','type','wholesalePrice')
  `;

  const requiredProduct = new Set(["qrCode", "type", "wholesalePrice"]);
  const foundProduct = new Set(Array.isArray(productCols) ? productCols.map((r) => r?.column_name).filter(Boolean) : []);
  for (const k of requiredProduct) {
    if (!foundProduct.has(k)) {
      throw new Error(
        "Database belum ter-migrate: kolom Product.* belum lengkap. Jalankan `npm.cmd run prisma:deploy` (production/Vercel) atau `npm.cmd run prisma:migrate` (lokal), lalu ulangi `npm.cmd run db:seed`."
      );
    }
  }

  const shiftCols = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'CashierShift'
      AND column_name IN ('branchId','cashSystem','createdAt','updatedAt')
  `;

  const requiredShift = new Set(["branchId", "cashSystem", "createdAt", "updatedAt"]);
  const foundShift = new Set(Array.isArray(shiftCols) ? shiftCols.map((r) => r?.column_name).filter(Boolean) : []);
  for (const k of requiredShift) {
    if (!foundShift.has(k)) {
      throw new Error(
        "Database belum ter-migrate untuk Shiftbook (CashierShift.* belum lengkap). Jalankan `npm.cmd run prisma:deploy` / `npm.cmd run prisma:migrate`, lalu ulangi seed."
      );
    }
  }

  const stockCols = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'ProductWarehouseStock'
      AND column_name = 'variantId'
  `;
  const hasVariantId = Array.isArray(stockCols) && stockCols.some((r) => r?.column_name === "variantId");
  if (!hasVariantId) {
    throw new Error(
      "Database belum ter-migrate untuk inventory (ProductWarehouseStock.variantId belum ada). Jalankan `npm.cmd run prisma:deploy` / `npm.cmd run prisma:migrate`, lalu ulangi seed."
    );
  }
}

async function upsertStock({ tenantId, warehouseId, productId, variantId = null, batchId = null, qty }) {
  const where = {
    tenantId,
    warehouseId,
    productId,
    variantId,
    batchId,
  };
  const existing = await prisma.productWarehouseStock.findFirst({ where });
  if (existing) {
    await prisma.productWarehouseStock.update({ where: { id: existing.id }, data: { qty } });
    return existing.id;
  }
  const created = await prisma.productWarehouseStock.create({ data: { ...where, qty }, select: { id: true } });
  return created.id;
}

async function createSale({ tenantId, cashierId, shiftId, items, method, createdAt, received }) {
  const subtotal = round2(items.reduce((a, x) => a + x.lineTotal, 0));
  const tax = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + tax);
  const receivedAmount = method === "CASH" ? received ?? Math.ceil(total / 5000) * 5000 : total;
  const changeAmount = method === "CASH" ? round2(receivedAmount - total) : 0;

  return prisma.sale.create({
    data: {
      tenantId,
      invoiceNo: inv("TRX"),
      cashierId: cashierId ?? null,
      shiftId: shiftId ?? null,
      subtotal,
      discount: 0,
      tax,
      total,
      status: "PAID",
      createdAt,
      updatedAt: createdAt,
      items: {
        create: items.map((l) => ({
          tenantId,
          productId: l.productId,
          name: l.name,
          sku: l.sku,
          price: l.price,
          qty: l.qty,
          lineTotal: l.lineTotal,
        })),
      },
      payments: {
        create: {
          tenantId,
          method,
          amount: total,
          receivedAmount,
          changeAmount,
          reference: method === "QRIS" ? `QR-${inv("REF")}` : null,
          createdAt,
        },
      },
    },
    select: { id: true, total: true },
  });
}

async function seedDemoInventory({
  tenantId,
  mainBranchId,
  mallBranchId,
  warehouseCentralId,
  warehouseMainId,
  warehouseMallId,
  prodBySku,
}) {
  const now = new Date();

  // Variants for Kopi Susu Gula Aren (SKU-0006, type VARIANT)
  const variantCount = await prisma.productVariant.count({ where: { tenantId, productId: prodBySku.get("SKU-0006").id } });
  if (variantCount === 0) {
    await prisma.productVariant.createMany({
      data: [
        { tenantId, productId: prodBySku.get("SKU-0006").id, sku: "SKU-0006-R", barcode: "899000000006-R", name: "Kopi Susu Gula Aren Reguler", attributes: { size: "Reguler", ice: true }, costPrice: 10000, sellingPrice: 25000 },
        { tenantId, productId: prodBySku.get("SKU-0006").id, sku: "SKU-0006-L", barcode: "899000000006-L", name: "Kopi Susu Gula Aren Large", attributes: { size: "Large", ice: true }, costPrice: 12000, sellingPrice: 28000 },
      ],
    });
  }
  const variantRows = await prisma.productVariant.findMany({ where: { tenantId, productId: prodBySku.get("SKU-0006").id } });

  // Bundle (SKU-0011)
  const bundleCount = await prisma.productBundle.count({ where: { tenantId } });
  if (bundleCount === 0) {
    await prisma.productBundle.create({
      data: {
        tenantId,
        productId: prodBySku.get("SKU-0011").id,
        name: "Paket Hemat",
        items: {
          create: [
            { tenantId, productId: prodBySku.get("SKU-0001").id, qty: 1 },
            { tenantId, productId: prodBySku.get("SKU-0004").id, qty: 1 },
          ],
        },
      },
    });
  }

  // Stock per warehouse (deterministic)
  const entries = [...productSeeds.entries()];
  for (const [idx, p] of entries) {
    const product = prodBySku.get(p.sku);
    if (!product) continue;
    const central = 40 + idx * 25;
    const main = 15 + idx * 12;
    const mall = 8 + idx * 6;

    if (p.type === "VARIANT") {
      for (const v of variantRows) {
        await upsertStock({ tenantId, warehouseId: warehouseCentralId, productId: product.id, variantId: v.id, qty: central });
        await upsertStock({ tenantId, warehouseId: warehouseMainId, productId: product.id, variantId: v.id, qty: main });
        await upsertStock({ tenantId, warehouseId: warehouseMallId, productId: product.id, variantId: v.id, qty: mall });
      }
      continue;
    }

    if (p.trackBatch) {
      // Batch-tracked product: batch rows in central warehouse, plain rows elsewhere
      const existingBatches = await prisma.productBatch.count({ where: { tenantId, productId: product.id } });
      if (existingBatches === 0) {
        await prisma.productBatch.createMany({
          data: [
            { tenantId, productId: product.id, warehouseId: warehouseCentralId, batchNumber: "B-2606-001", batchNo: "B-2606-001", quantity: 60, costPrice: 18000, source: "PURCHASE", receivedAt: new Date(now.getTime() - 50 * 86400000), expiredDate: new Date(2026, 10, 30), expiredAt: new Date(2026, 10, 30) },
            { tenantId, productId: product.id, warehouseId: warehouseCentralId, batchNumber: "B-2607-002", batchNo: "B-2607-002", quantity: 40, costPrice: 17500, source: "PURCHASE", receivedAt: new Date(now.getTime() - 20 * 86400000), expiredDate: new Date(2027, 0, 15), expiredAt: new Date(2027, 0, 15) },
          ],
        });
      }
      const batchRows = await prisma.productBatch.findMany({ where: { tenantId, productId: product.id, warehouseId: warehouseCentralId } });
      for (const b of batchRows) {
        await upsertStock({ tenantId, warehouseId: warehouseCentralId, productId: product.id, batchId: b.id, qty: Number(b.quantity) });
      }
      await upsertStock({ tenantId, warehouseId: warehouseMainId, productId: product.id, qty: main });
      await upsertStock({ tenantId, warehouseId: warehouseMallId, productId: product.id, qty: mall });
      continue;
    }

    await upsertStock({ tenantId, warehouseId: warehouseCentralId, productId: product.id, qty: central });
    await upsertStock({ tenantId, warehouseId: warehouseMainId, productId: product.id, qty: main });
    await upsertStock({ tenantId, warehouseId: warehouseMallId, productId: product.id, qty: mall });
  }

  // Serials for Wireless Headphone (SKU-0003)
  const serialCount = await prisma.productSerial.count({ where: { tenantId, productId: prodBySku.get("SKU-0003").id } });
  if (serialCount === 0) {
    await prisma.productSerial.createMany({
      data: [
        { tenantId, productId: prodBySku.get("SKU-0003").id, serialNo: "SN-2608-0001", status: "AVAILABLE", warrantyUntil: new Date(2027, 7, 18) },
        { tenantId, productId: prodBySku.get("SKU-0003").id, serialNo: "SN-2608-0002", status: "AVAILABLE", warrantyUntil: new Date(2027, 7, 18) },
        { tenantId, productId: prodBySku.get("SKU-0003").id, serialNo: "SN-2608-0003", status: "AVAILABLE", warrantyUntil: new Date(2027, 7, 18) },
      ],
    });
  }

  // Price rules + history
  const priceCount = await prisma.productPrice.count({ where: { tenantId, productId: { in: [...prodBySku.values()].map((p) => p.id) } } });
  if (priceCount === 0) {
    const priceRows = [];
    const priceHistoryRows = [];
    for (const p of productSeeds) {
      const product = prodBySku.get(p.sku);
      if (!product || p.type === "VARIANT") continue;
      const mallPrice = Math.round(p.sellingPrice * 1.05);
      priceRows.push(
        { tenantId, branchId: null, productId: product.id, priceType: "RETAIL", price: p.sellingPrice, isActive: true },
        { tenantId, branchId: mainBranchId, productId: product.id, priceType: "RETAIL", price: p.sellingPrice, isActive: true },
        { tenantId, branchId: mallBranchId, productId: product.id, priceType: "RETAIL", price: mallPrice, isActive: true },
        { tenantId, branchId: null, productId: product.id, priceType: "WHOLESALE", price: p.wholesalePrice, isActive: true },
        { tenantId, branchId: mainBranchId, productId: product.id, priceType: "MEMBER", price: Math.round(p.sellingPrice * 0.95), isActive: true }
      );
      priceHistoryRows.push({
        tenantId,
        branchId: mainBranchId,
        productId: product.id,
        priceType: "RETAIL",
        price: p.sellingPrice,
        changedAt: new Date(now.getTime() - 30 * 86400000),
      });
    }
    await prisma.productPrice.createMany({ data: priceRows });
    await prisma.productPriceHistory.createMany({ data: priceHistoryRows });
  }

  // Cost history
  const costCount = await prisma.productCostHistory.count({ where: { tenantId, productId: { in: [...prodBySku.values()].map((p) => p.id) } } });
  if (costCount === 0) {
    await prisma.productCostHistory.createMany({
      data: productSeeds
        .filter((p) => p.type !== "VARIANT")
        .map((p) => ({
          tenantId,
          productId: prodBySku.get(p.sku).id,
          cost: p.costPrice,
          source: "MANUAL",
          createdAt: new Date(now.getTime() - 30 * 86400000),
        })),
    });
  }

  // Discounts
  const discountCount = await prisma.productDiscount.count({ where: { tenantId } });
  if (discountCount === 0) {
    await prisma.productDiscount.createMany({
      data: [
        { tenantId, productId: prodBySku.get("SKU-0002").id, type: "PERCENT", value: 10, startsAt: new Date(now.getTime() - 7 * 86400000), endsAt: new Date(now.getTime() + 30 * 86400000), isActive: true },
        { tenantId, productId: prodBySku.get("SKU-0004").id, type: "BOGO", value: 0, buyQty: 2, getQty: 1, startsAt: new Date(now.getTime() - 7 * 86400000), endsAt: new Date(now.getTime() + 14 * 86400000), isActive: true },
        { tenantId, productId: prodBySku.get("SKU-0010").id, type: "AMOUNT", value: 5000, startsAt: new Date(now.getTime() - 2 * 86400000), endsAt: new Date(now.getTime() + 14 * 86400000), isActive: true },
      ],
    });
  }

  // Product <-> Supplier links
  const suppliers = await prisma.supplier.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const supMain = suppliers.find((s) => s.name === "PT Sumber Makmur")?.id;
  const supElectro = suppliers.find((s) => s.name === "PT Elektronik Jaya")?.id;
  if (supMain) {
    for (const p of productSeeds) {
      const product = prodBySku.get(p.sku);
      if (!product) continue;
      const existing = await prisma.productSupplier.findFirst({ where: { tenantId, productId: product.id, supplierId: supMain } });
      if (!existing) {
        await prisma.productSupplier.create({ data: { tenantId, productId: product.id, supplierId: supMain, isPrimary: true, lastCost: p.costPrice } });
      }
    }
  }
  if (supElectro) {
    const existing = await prisma.productSupplier.findFirst({ where: { tenantId, productId: prodBySku.get("SKU-0003").id, supplierId: supElectro } });
    if (!existing) {
      await prisma.productSupplier.create({ data: { tenantId, productId: prodBySku.get("SKU-0003").id, supplierId: supElectro, isPrimary: false, lastCost: 590000 } });
    }
  }
}

async function seedDemoPurchases({ tenantId, supplierId, prodBySku }) {
  const poCount = await prisma.purchaseOrder.count({ where: { tenantId } });
  if (poCount > 0) return;

  const now = new Date();

  const po1Items = [
    { productId: prodBySku.get("SKU-0003").id, name: prodBySku.get("SKU-0003").name, sku: "SKU-0003", costPrice: 600000, qty: 5 },
    { productId: prodBySku.get("SKU-0002").id, name: prodBySku.get("SKU-0002").name, sku: "SKU-0002", costPrice: 14000, qty: 20 },
  ];
  const po1Subtotal = round2(po1Items.reduce((a, x) => a + x.costPrice * x.qty, 0));

  await prisma.purchaseOrder.create({
    data: {
      tenantId,
      supplierId,
      orderNo: poNo(1),
      status: "RECEIVED",
      notes: "PO penerimaan awal stok.",
      subtotal: po1Subtotal,
      tax: round2(po1Subtotal * TAX_RATE),
      total: round2(po1Subtotal * (1 + TAX_RATE)),
      createdAt: new Date(now.getTime() - 20 * 86400000),
      items: {
        create: po1Items.map((l) => ({
          tenantId,
          productId: l.productId,
          name: l.name,
          sku: l.sku,
          costPrice: l.costPrice,
          qty: l.qty,
          lineTotal: l.costPrice * l.qty,
        })),
      },
    },
  });

  const po2Items = [
    { productId: prodBySku.get("SKU-0008").id, name: prodBySku.get("SKU-0008").name, sku: "SKU-0008", costPrice: 9000, qty: 30 },
    { productId: prodBySku.get("SKU-0007").id, name: prodBySku.get("SKU-0007").name, sku: "SKU-0007", costPrice: 18000, qty: 12 },
  ];
  const po2Subtotal = round2(po2Items.reduce((a, x) => a + x.costPrice * x.qty, 0));

  await prisma.purchaseOrder.create({
    data: {
      tenantId,
      supplierId,
      orderNo: poNo(2),
      status: "DRAFT",
      notes: "Draft PO restock mingguan.",
      subtotal: po2Subtotal,
      tax: round2(po2Subtotal * TAX_RATE),
      total: round2(po2Subtotal * (1 + TAX_RATE)),
      createdAt: new Date(now.getTime() - 2 * 86400000),
      items: {
        create: po2Items.map((l) => ({
          tenantId,
          productId: l.productId,
          name: l.name,
          sku: l.sku,
          costPrice: l.costPrice,
          qty: l.qty,
          lineTotal: l.costPrice * l.qty,
        })),
      },
    },
  });
}

async function seedDemoShiftsAndSales({ tenantId, mainBranchId, cashierId, approverId, prodBySku }) {
  const now = new Date();
  const productIds = [...prodBySku.values()];

  const buildSaleData = (i, createdAt) => {
    const pick1 = productIds[i % productIds.length];
    const pick2 = productIds[(i + 1) % productIds.length];
    const items = [
      { productId: pick1.id, qty: 1 + (i % 2), name: pick1.name, sku: pick1.sku, price: Number(pick1.sellingPrice) },
      { productId: pick2.id, qty: 1, name: pick2.name, sku: pick2.sku, price: Number(pick2.sellingPrice) },
    ].map((it) => ({ ...it, lineTotal: round2(it.price * it.qty) }));
    return { items, createdAt };
  };

  // --- Approved shift (kemarin) ---
  const approvedExists = await prisma.cashierShift.findFirst({
    where: { tenantId, branchId: mainBranchId, cashierId, status: "APPROVED" },
    select: { id: true },
  });

  if (!approvedExists) {
    const yesterday = new Date(now.getTime() - 86400000);
    const openedAt = new Date(yesterday);
    openedAt.setHours(8, 0, 0, 0);
    const closedAt = new Date(yesterday);
    closedAt.setHours(21, 30, 0, 0);
    const approvedAt = new Date(yesterday);
    approvedAt.setHours(21, 45, 0, 0);

    const approvedShift = await prisma.cashierShift.create({
      data: {
        tenantId,
        branchId: mainBranchId,
        cashierId,
        status: "APPROVED",
        openedAt,
        closedAt,
        approvedById: approverId,
        approvedAt,
        openingCash: 500000,
        openNote: "Buka kasir pagi",
        closeNote: "Tutup kasir malam",
      },
      select: { id: true },
    });

    const summary = { totalSales: 0, totalCash: 0, totalQris: 0, totalTransfer: 0, totalEwallet: 0, transactionCount: 0 };
    for (let i = 0; i < 6; i++) {
      const at = new Date(yesterday);
      at.setHours(8 + i * 2, 15 + i * 7, 0, 0);
      const method = PAY_METHODS[i % PAY_METHODS.length];
      const sale = await createSale({
        tenantId,
        cashierId,
        shiftId: approvedShift.id,
        items: buildSaleData(i, at).items,
        method,
        createdAt: at,
      });
      const total = Number(sale.total);
      summary.totalSales = round2(summary.totalSales + total);
      summary.transactionCount += 1;
      if (method === "CASH") summary.totalCash = round2(summary.totalCash + total);
      else if (method === "QRIS") summary.totalQris = round2(summary.totalQris + total);
      else if (method === "TRANSFER") summary.totalTransfer = round2(summary.totalTransfer + total);
      else if (method === "EWALLET") summary.totalEwallet = round2(summary.totalEwallet + total);
    }

    await prisma.cashierShift.update({
      where: { id: approvedShift.id },
      data: {
        totalSales: summary.totalSales,
        totalCash: summary.totalCash,
        totalQris: summary.totalQris,
        totalTransfer: summary.totalTransfer,
        totalEwallet: summary.totalEwallet,
        transactionCount: summary.transactionCount,
        cashSystem: summary.totalCash,
        cashCounted: round2(summary.totalCash + 50000),
        cashDifference: 50000,
      },
    });
  }

  // --- Open shift (hari ini) ---
  const openExists = await prisma.cashierShift.findFirst({
    where: { tenantId, branchId: mainBranchId, cashierId, status: "OPEN" },
    select: { id: true },
  });

  if (!openExists) {
    const today = new Date(now);
    today.setHours(8, 0, 0, 0);
    const openShift = await prisma.cashierShift.create({
      data: {
        tenantId,
        branchId: mainBranchId,
        cashierId,
        status: "OPEN",
        openedAt: today,
        openingCash: 500000,
        openNote: "Shift pagi",
      },
      select: { id: true },
    });

    const openSummary = { totalSales: 0, totalCash: 0, totalQris: 0, totalTransfer: 0, totalEwallet: 0, transactionCount: 0 };
    const todayMethods = ["CASH", "CASH", "QRIS"];
    for (let i = 0; i < 3; i++) {
      const at = new Date(now);
      at.setHours(8 + i * 3, 10, 0, 0);
      const createdAt = at.getTime() > now.getTime() ? now : at;
      const sale = await createSale({
        tenantId,
        cashierId,
        shiftId: openShift.id,
        items: buildSaleData(i + 3, at).items,
        method: todayMethods[i],
        createdAt,
      });
      const total = Number(sale.total);
      openSummary.totalSales = round2(openSummary.totalSales + total);
      openSummary.transactionCount += 1;
      if (todayMethods[i] === "CASH") openSummary.totalCash = round2(openSummary.totalCash + total);
      else openSummary.totalQris = round2(openSummary.totalQris + total);
    }

    await prisma.cashierShift.update({
      where: { id: openShift.id },
      data: {
        totalSales: openSummary.totalSales,
        totalCash: openSummary.totalCash,
        totalQris: openSummary.totalQris,
        totalTransfer: openSummary.totalTransfer,
        totalEwallet: openSummary.totalEwallet,
        transactionCount: openSummary.transactionCount,
        cashSystem: openSummary.totalCash,
      },
    });
  }

  // --- Sales tanpa shift (2 hari lalu) ---
  const unassignedCount = await prisma.sale.count({ where: { tenantId, shiftId: null } });
  if (unassignedCount === 0) {
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
    await createSale({
      tenantId,
      cashierId,
      shiftId: null,
      items: buildSaleData(9, twoDaysAgo).items,
      method: "CASH",
      createdAt: new Date(twoDaysAgo.setHours(10, 0, 0, 0)),
    });
    await createSale({
      tenantId,
      cashierId,
      shiftId: null,
      items: buildSaleData(10, twoDaysAgo).items,
      method: "QRIS",
      createdAt: new Date(twoDaysAgo.setHours(14, 0, 0, 0)),
    });
  }
}

async function seedTenant({ name, slug, status, planId, trialDays, users, demo = false }) {
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  // Neon note: avoid a long interactive transaction (can be flaky with poolers).
  const effectiveTrialDays = typeof trialDays === "number" ? trialDays : 0;
  const effectiveTrialEndsAt =
    status === "TRIAL" && effectiveTrialDays > 0 ? new Date(Date.now() + effectiveTrialDays * 24 * 60 * 60 * 1000) : null;

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: { name, status, planId: planId ?? null, trialEndsAt: effectiveTrialEndsAt ?? undefined },
    create: { name, slug, status, planId: planId ?? null, trialEndsAt: effectiveTrialEndsAt ?? null },
  });

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: "printer" } },
    update: { value: DEFAULT_PRINTER_SETTINGS },
    create: { tenantId: tenant.id, key: "printer", value: DEFAULT_PRINTER_SETTINGS },
  });

  const roleMap = new Map();
  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: roleName } },
      update: {},
      create: { tenantId: tenant.id, name: roleName },
    });
    roleMap.set(roleName, role.id);
  }

  const permissionMap = new Map();
  for (const p of permissions) {
    const permission = await prisma.permission.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: p.key } },
      update: { name: p.name },
      create: { tenantId: tenant.id, key: p.key, name: p.name },
    });
    permissionMap.set(p.key, permission.id);
  }

  const rolePermissionRows = [];
  for (const roleName of roles) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;
    const keys = rolePermissionMatrix[roleName] ?? [];
    for (const key of keys) {
      const permissionId = permissionMap.get(key);
      if (!permissionId) continue;
      rolePermissionRows.push({ roleId, permissionId });
    }
  }
  if (rolePermissionRows.length > 0) {
    await prisma.rolePermission.createMany({ data: rolePermissionRows, skipDuplicates: true });
  }

  // Users + memberships (dibutuhkan sebelum shift/sales untuk demo tenant)
  const userMap = new Map();
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash, isSuperAdmin: Boolean(u.isSuperAdmin), emailVerified: new Date() },
      create: { name: u.name, email: u.email, passwordHash, isSuperAdmin: Boolean(u.isSuperAdmin), emailVerified: new Date() },
    });
    userMap.set(u.email, user);
  }

  if (demo) {
    // Categories / brands / units
    const categoryNames = ["Food", "Drink", "Snack", "Electronics", "Hygiene"];
    const categoryMap = new Map();
    for (const c of categoryNames) {
      const cat = await prisma.productCategory.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: c } },
        update: {},
        create: { tenantId: tenant.id, name: c },
        select: { id: true },
      });
      categoryMap.set(c, cat.id);
    }

    const brandNames = ["Generic", "Local Brand"];
    const brandMap = new Map();
    for (const b of brandNames) {
      const brand = await prisma.productBrand.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: b } },
        update: {},
        create: { tenantId: tenant.id, name: b },
        select: { id: true },
      });
      brandMap.set(b, brand.id);
    }

    const unitNames = ["pcs", "pack", "cup", "box", "kg"];
    const unitMap = new Map();
    for (const un of unitNames) {
      const unit = await prisma.productUnit.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: un } },
        update: {},
        create: { tenantId: tenant.id, name: un },
        select: { id: true },
      });
      unitMap.set(un, unit.id);
    }

    // Products
    for (const p of productSeeds) {
      const marginPct = p.sellingPrice > 0 ? round2(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0;
      const data = {
        name: p.name,
        barcode: p.barcode,
        qrCode: p.barcode,
        slug: slugify(p.name),
        categoryId: categoryMap.get(p.category),
        brandId: brandMap.get("Generic"),
        unitId: unitMap.get(p.unit),
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        marginPct,
        wholesalePrice: p.wholesalePrice,
        wholesaleMinQty: p.wholesaleMinQty,
        minStock: p.minStock,
        isActive: true,
        isFeatured: Boolean(p.isFeatured),
        type: p.type ?? "SINGLE",
      };
      await prisma.product.upsert({
        where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
        update: data,
        create: { tenantId: tenant.id, sku: p.sku, ...data },
        select: { id: true },
      });
    }

    const prodRows = await prisma.product.findMany({
      where: { tenantId: tenant.id, sku: { in: productSeeds.map((p) => p.sku) } },
      select: { id: true, sku: true, name: true, sellingPrice: true, costPrice: true },
    });
    const prodBySku = new Map(prodRows.map((p) => [p.sku, p]));

    // Customers
    const customers = [
      { id: `${tenant.id}-cust-1`, name: "Budi Kusuma", email: "budi@example.com", phone: "081234567890", address: "Jakarta" },
      { id: `${tenant.id}-cust-2`, name: "Siti Aminah", email: "siti@example.com", phone: "082198765432", address: "Bandung" },
      { id: `${tenant.id}-cust-3`, name: "Rudi Hartono", email: "rudi@example.com", phone: "083112233445", address: "Surabaya" },
    ];
    for (const c of customers) {
      await prisma.customer.upsert({
        where: { id: c.id },
        update: { name: c.name, email: c.email, phone: c.phone, address: c.address, isActive: true },
        create: { id: c.id, tenantId: tenant.id, name: c.name, email: c.email, phone: c.phone, address: c.address, isActive: true },
      });
    }

    // Suppliers
    const suppliers = [
      { id: `${tenant.id}-sup-1`, name: "PT Sumber Makmur", email: "sales@sumbermakmur.co", phone: "021555000", address: "Bandung" },
      { id: `${tenant.id}-sup-2`, name: "PT Elektronik Jaya", email: "cs@elektronikjaya.co", phone: "021777123", address: "Jakarta" },
    ];
    for (const s of suppliers) {
      await prisma.supplier.upsert({
        where: { id: s.id },
        update: { name: s.name, email: s.email, phone: s.phone, address: s.address, isActive: true },
        create: { id: s.id, tenantId: tenant.id, name: s.name, email: s.email, phone: s.phone, address: s.address, isActive: true },
      });
    }

    // Branches
    const branchCategory = await prisma.branchCategory.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Default" } },
      update: {},
      create: { tenantId: tenant.id, name: "Default" },
      select: { id: true },
    });

    const mainBranch = await prisma.branch.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "MAIN" } },
      update: { name: "Main Outlet", categoryId: branchCategory.id, isActive: true },
      create: { tenantId: tenant.id, code: "MAIN", name: "Main Outlet", categoryId: branchCategory.id, isActive: true },
      select: { id: true },
    });

    const mallBranch = await prisma.branch.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "MALL" } },
      update: { name: "Cabang Mall", categoryId: branchCategory.id, isActive: true },
      create: { tenantId: tenant.id, code: "MALL", name: "Cabang Mall", categoryId: branchCategory.id, isActive: true },
      select: { id: true },
    });

    // Warehouses
    const warehouseCentral = await prisma.warehouse.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Gudang Pusat" } },
      update: { type: "CENTRAL", isActive: true },
      create: { tenantId: tenant.id, name: "Gudang Pusat", type: "CENTRAL", isActive: true },
      select: { id: true },
    });
    const warehouseMain = await prisma.warehouse.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Gudang Outlet Utama" } },
      update: { branchId: mainBranch.id, type: "BRANCH", isActive: true },
      create: { tenantId: tenant.id, name: "Gudang Outlet Utama", branchId: mainBranch.id, type: "BRANCH", isActive: true },
      select: { id: true },
    });
    const warehouseMall = await prisma.warehouse.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Gudang Cabang Mall" } },
      update: { branchId: mallBranch.id, type: "BRANCH", isActive: true },
      create: { tenantId: tenant.id, name: "Gudang Cabang Mall", branchId: mallBranch.id, type: "BRANCH", isActive: true },
      select: { id: true },
    });

    // Printers
    const printerCount = await prisma.printer.count({ where: { tenantId: tenant.id } });
    if (printerCount === 0) {
      await prisma.printer.createMany({
        data: [
          { tenantId: tenant.id, branchId: mainBranch.id, name: "Printer Kasir Utama", type: "BLUETOOTH", paperSize: "80mm", isDefault: true, isActive: true },
          { tenantId: tenant.id, branchId: mallBranch.id, name: "Printer Kasir Mall", type: "BLUETOOTH", paperSize: "58mm", isDefault: true, isActive: true },
        ],
      });
    }

    // Inventory (stock, variants, batches, serials, prices, discounts, suppliers links)
    await seedDemoInventory({
      tenantId: tenant.id,
      mainBranchId: mainBranch.id,
      mallBranchId: mallBranch.id,
      warehouseCentralId: warehouseCentral.id,
      warehouseMainId: warehouseMain.id,
      warehouseMallId: warehouseMall.id,
      prodBySku,
    });

    // Purchase orders
    const sup1 = await prisma.supplier.findUnique({ where: { id: `${tenant.id}-sup-1` }, select: { id: true } });
    if (sup1) {
      await seedDemoPurchases({ tenantId: tenant.id, supplierId: sup1.id, prodBySku });
    }

    // TenantUser memberships
    for (const u of users) {
      const user = userMap.get(u.email);
      if (!user) continue;
      await prisma.tenantUser.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        update: { roleId: roleMap.get(u.role) ?? null, branchId: mainBranch.id },
        create: { tenantId: tenant.id, userId: user.id, roleId: roleMap.get(u.role) ?? null, branchId: mainBranch.id },
      });
    }

    // Shifts + sales
    const cashierUser = [...userMap.values()].find((u) => {
      const def = users.find((x) => x.email === u.email);
      return def?.role === "CASHIER";
    });
    const ownerUser = [...userMap.values()].find((u) => {
      const def = users.find((x) => x.email === u.email);
      return def?.role === "OWNER";
    });
    if (cashierUser && ownerUser) {
      await seedDemoShiftsAndSales({
        tenantId: tenant.id,
        mainBranchId: mainBranch.id,
        cashierId: cashierUser.id,
        approverId: ownerUser.id,
        prodBySku,
      });
    }
  } else {
    // Non-demo tenant: memberships tetap dibuat
    for (const u of users) {
      const user = userMap.get(u.email);
      if (!user) continue;
      await prisma.tenantUser.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        update: { roleId: roleMap.get(u.role) ?? null, branchId: null },
        create: { tenantId: tenant.id, userId: user.id, roleId: roleMap.get(u.role) ?? null, branchId: null },
      });
    }
  }

  return tenant;
}

async function main() {
  await assertSchemaReady();

  const starterPlan = await prisma.plan.upsert({
    where: { slug: "starter" },
    update: { name: "Starter", priceMonthly: 0, currency: "IDR", trialDays: 0, isPopular: false, isActive: true, description: "Solusi dasar untuk UMKM." },
    create: { slug: "starter", name: "Starter", priceMonthly: 0, currency: "IDR", trialDays: 0, isPopular: false, isActive: true, description: "Solusi dasar untuk UMKM." },
    select: { id: true, trialDays: true },
  });

  const proPlan = await prisma.plan.upsert({
    where: { slug: "pro" },
    update: { name: "Pro", priceMonthly: 249000, currency: "IDR", trialDays: 14, isPopular: true, isActive: true, description: "Untuk bisnis berkembang dengan kebutuhan data lengkap." },
    create: { slug: "pro", name: "Pro", priceMonthly: 249000, currency: "IDR", trialDays: 14, isPopular: true, isActive: true, description: "Untuk bisnis berkembang dengan kebutuhan data lengkap." },
    select: { id: true, trialDays: true },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { slug: "enterprise" },
    update: { name: "Enterprise", priceMonthly: 0, currency: "IDR", trialDays: 0, isPopular: false, isActive: true, description: "Solusi khusus untuk skala besar." },
    create: { slug: "enterprise", name: "Enterprise", priceMonthly: 0, currency: "IDR", trialDays: 0, isPopular: false, isActive: true, description: "Solusi khusus untuk skala besar." },
    select: { id: true },
  });
  void enterprisePlan;

  // Global data
  await prisma.announcement.upsert({
    where: { id: "announcement-welcome" },
    update: { title: "Selamat datang di POS Pro", message: "Nikmati kemudahan mengelola kasir, produk, dan stok dalam satu aplikasi.", status: "PUBLISHED", startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 30 * 86400000) },
    create: { id: "announcement-welcome", title: "Selamat datang di POS Pro", message: "Nikmati kemudahan mengelola kasir, produk, dan stok dalam satu aplikasi.", status: "PUBLISHED", startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 30 * 86400000) },
  });

  await prisma.globalSetting.upsert({
    where: { key: "site_config" },
    update: { value: { maintenanceMode: false, registrationOpen: true, supportEmail: "support@pospro.local" } },
    create: { key: "site_config", value: { maintenanceMode: false, registrationOpen: true, supportEmail: "support@pospro.local" } },
  });

  const platform = await seedTenant({
    name: "POS SaaS Platform",
    slug: "platform",
    status: "ACTIVE",
    planId: starterPlan.id,
    trialDays: starterPlan.trialDays,
    users: [{ name: "Super Admin", email: "superadmin@platform.local", role: "OWNER", isSuperAdmin: true }],
    demo: false,
  });

  const t1 = await seedTenant({
    name: "Demo Resto & Cafe",
    slug: "demo-resto",
    status: "ACTIVE",
    planId: proPlan.id,
    trialDays: proPlan.trialDays,
    users: [
      { name: "Owner Demo", email: "owner@demo-resto.local", role: "OWNER" },
      { name: "Admin Demo", email: "admin@demo-resto.local", role: "ADMIN" },
      { name: "Kasir Demo", email: "kasir@demo-resto.local", role: "CASHIER" },
      { name: "Gudang Resto", email: "gudang@demo-resto.local", role: "WAREHOUSE" },
    ],
    demo: true,
  });

  const t2 = await seedTenant({
    name: "Demo Mart",
    slug: "demo-mart",
    status: "TRIAL",
    planId: proPlan.id,
    trialDays: proPlan.trialDays,
    users: [
      { name: "Owner Mart", email: "owner@demo-mart.local", role: "OWNER" },
      { name: "Kasir Mart", email: "kasir@demo-mart.local", role: "CASHIER" },
      { name: "Gudang Mart", email: "gudang@demo-mart.local", role: "WAREHOUSE" },
      { name: "Akuntan Mart", email: "akuntan@demo-mart.local", role: "ACCOUNTANT" },
      { name: "Manager Cabang", email: "manager@demo-mart.local", role: "BRANCH_MANAGER" },
    ],
    demo: true,
  });

  // License key untuk tenant demo berbayar
  await prisma.licenseKey.upsert({
    where: { serial: "POSPRO-2026-0001" },
    update: { planId: proPlan.id, tenantId: t1.id, expiresAt: new Date(Date.now() + 365 * 86400000), revokedAt: null },
    create: { serial: "POSPRO-2026-0001", planId: proPlan.id, tenantId: t1.id, expiresAt: new Date(Date.now() + 365 * 86400000) },
  });

  console.log("[seed] Done");
  console.log(`[seed] Tenants: ${platform.slug}, ${t1.slug}, ${t2.slug}`);
  console.log(`[seed] Default password: ${seedPassword === DEFAULT_PASSWORD ? DEFAULT_PASSWORD : "(from SEED_PASSWORD)"}`);
  console.log(`[seed] Demo login: owner@demo-resto.local / ${seedPassword === DEFAULT_PASSWORD ? DEFAULT_PASSWORD : "(from SEED_PASSWORD)"} (superadmin@platform.local untuk super admin)`);
}

main()
  .catch((e) => {
    console.error("[seed] Failed", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });