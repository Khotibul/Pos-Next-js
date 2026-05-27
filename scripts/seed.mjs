import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Password123!";
const seedPassword = process.env.SEED_PASSWORD?.trim() || DEFAULT_PASSWORD;

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
  ],
  // Warehouse staff commonly handles stock movements.
  // Keep inventory perms for future inventory module parity.

  ACCOUNTANT: ["dashboard.read", "branches.read", "sales.read", "reports.read", "products.read", "customers.read", "suppliers.read", "billing.read", "transactions.shift.read", "transactions.shift.export"],
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
  ],
};

const DEFAULT_PRINTER_SETTINGS = {
  paper: "80mm",
  autoPrintAfterPayment: false,
  showLogo: false,
  headerTitle: "POS Pro",
  headerSubtitle: "",
  footerNote: "Terima kasih sudah berbelanja.",
  showTax: true,
  showDiscount: true,
};

function inv(prefix = "TRX") {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${y}${m}${day}-${rand}`;
}

async function assertSchemaReady() {
  // Provide an actionable error if the database hasn't applied the latest migrations yet.
  const productCols = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Product'
      AND column_name = 'qrCode'
  `;

  const hasQrCode = Array.isArray(productCols) && productCols.some((r) => r?.column_name === "qrCode");
  if (!hasQrCode) {
    throw new Error(
      "Database belum ter-migrate: kolom Product.qrCode tidak ditemukan. Jalankan `npm.cmd run prisma:deploy` (production/Vercel) atau `npm.cmd run prisma:migrate` (lokal), lalu ulangi `npm.cmd run db:seed`."
    );
  }

  const shiftCols = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'CashierShift'
      AND column_name IN ('branchId','cashSystem','createdAt','updatedAt')
  `;

  const required = new Set(["branchId", "cashSystem", "createdAt", "updatedAt"]);
  const found = new Set(Array.isArray(shiftCols) ? shiftCols.map((r) => r?.column_name).filter(Boolean) : []);
  for (const k of required) {
    if (!found.has(k)) {
      throw new Error(
        "Database belum ter-migrate untuk Shiftbook (CashierShift.* belum lengkap). Jalankan `npm.cmd run prisma:deploy` / `npm.cmd run prisma:migrate`, lalu ulangi seed."
      );
    }
  }
}

async function seedTenant({
  name,
  slug,
  status,
  planId,
  trialDays,
  users,
}) {
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

  const catFood = await prisma.productCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Food" } },
    update: {},
    create: { tenantId: tenant.id, name: "Food" },
  });
  const catDrink = await prisma.productCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Drink" } },
    update: {},
    create: { tenantId: tenant.id, name: "Drink" },
  });

  const brandGeneric = await prisma.productBrand.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Generic" } },
    update: {},
    create: { tenantId: tenant.id, name: "Generic" },
  });

  const unitPcs = await prisma.productUnit.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "pcs" } },
    update: {},
    create: { tenantId: tenant.id, name: "pcs" },
  });
  const unitPack = await prisma.productUnit.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "pack" } },
    update: {},
    create: { tenantId: tenant.id, name: "pack" },
  });

  const productSeeds = [
    { sku: "SKU-0001", name: "Cheeseburger Deluxe", barcode: "899000000001", categoryId: catFood.id, unitId: unitPcs.id, costPrice: 25000, sellingPrice: 45000 },
    { sku: "SKU-0002", name: "Caramel Latte", barcode: "899000000002", categoryId: catDrink.id, unitId: unitPack.id, costPrice: 14000, sellingPrice: 32000 },
    { sku: "SKU-0003", name: "Wireless Headphone", barcode: "899000000003", categoryId: catFood.id, unitId: unitPcs.id, costPrice: 600000, sellingPrice: 850000 },
    { sku: "SKU-0004", name: "French Fries Large", barcode: "899000000004", categoryId: catFood.id, unitId: unitPack.id, costPrice: 12000, sellingPrice: 20000 },
    { sku: "SKU-0005", name: "Iced Lemon Tea", barcode: "899000000005", categoryId: catDrink.id, unitId: unitPack.id, costPrice: 6000, sellingPrice: 15000 },
  ];

  const productIds = [];
  for (const p of productSeeds) {
    const up = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
      update: { name: p.name, sellingPrice: p.sellingPrice, costPrice: p.costPrice, isActive: true },
      create: {
        tenantId: tenant.id,
        sku: p.sku,
        name: p.name,
        barcode: p.barcode,
        qrCode: p.barcode,
        categoryId: p.categoryId,
        brandId: brandGeneric.id,
        unitId: p.unitId,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        isActive: true,
      },
      select: { id: true },
    });
    productIds.push(up.id);
  }

  await prisma.customer.upsert({
    where: { id: `${tenant.id}-cust-1` },
    update: { name: "Budi Kusuma", email: "budi@example.com", phone: "081234567890", isActive: true },
    create: { id: `${tenant.id}-cust-1`, tenantId: tenant.id, name: "Budi Kusuma", email: "budi@example.com", phone: "081234567890", address: "Jakarta", isActive: true },
  });

  await prisma.supplier.upsert({
    where: { id: `${tenant.id}-sup-1` },
    update: { name: "PT Sumber Makmur", email: "sales@sumbermakmur.co", phone: "021555000", isActive: true },
    create: { id: `${tenant.id}-sup-1`, tenantId: tenant.id, name: "PT Sumber Makmur", email: "sales@sumbermakmur.co", phone: "021555000", address: "Bandung", isActive: true },
  });

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

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash, isSuperAdmin: Boolean(u.isSuperAdmin), emailVerified: new Date() },
      create: { name: u.name, email: u.email, passwordHash, isSuperAdmin: Boolean(u.isSuperAdmin), emailVerified: new Date() },
    });

    await prisma.tenantUser.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: { roleId: roleMap.get(u.role) ?? null, branchId: mainBranch.id },
      create: { tenantId: tenant.id, userId: user.id, roleId: roleMap.get(u.role) ?? null, branchId: mainBranch.id },
    });
  }

  const now = new Date();
  const cashier = users.find((u) => u.role === "CASHIER")?.email || users[0]?.email;
  const cashierUser = cashier ? await prisma.user.findUnique({ where: { email: cashier }, select: { id: true } }) : null;

  const existingSales = await prisma.sale.count({ where: { tenantId: tenant.id } });
  if (existingSales < 8) {
    for (let i = 0; i < 8; i++) {
      const createdAt = new Date(now.getTime() - (i % 7) * 24 * 60 * 60 * 1000 - i * 60 * 60 * 1000);
      const pick1 = productIds[i % productIds.length];
      const pick2 = productIds[(i + 1) % productIds.length];
      const prod = await prisma.product.findMany({
        where: { tenantId: tenant.id, id: { in: [pick1, pick2] } },
        select: { id: true, name: true, sku: true, sellingPrice: true },
      });
      const map = new Map(prod.map((p) => [p.id, p]));
      const items = [
        { productId: pick1, qty: 1 + (i % 2) },
        { productId: pick2, qty: 1 },
      ].map((it) => {
        const p = map.get(it.productId);
        const price = Number(p?.sellingPrice ?? 0);
        const lineTotal = price * it.qty;
        return { ...it, name: p?.name ?? "Unknown", sku: p?.sku ?? "-", price, lineTotal };
      });
      const subtotal = items.reduce((a, x) => a + x.lineTotal, 0);
      const tax = subtotal * 0.11;
      const total = subtotal + tax;

      await prisma.sale.create({
        data: {
          tenantId: tenant.id,
          invoiceNo: inv("TRX"),
          cashierId: cashierUser?.id ?? null,
          subtotal,
          discount: 0,
          tax,
          total,
          status: "PAID",
          createdAt,
          updatedAt: createdAt,
          items: {
            create: items.map((l) => ({
              tenantId: tenant.id,
              productId: l.productId,
              name: l.name,
              sku: l.sku,
              price: l.price,
              qty: l.qty,
              lineTotal: l.lineTotal,
            })),
          },
          payments: { create: { tenantId: tenant.id, method: "CASH", amount: total, reference: null, createdAt } },
        },
        select: { id: true },
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
    select: { id: true, trialDays: true },
  });

  const platform = await seedTenant({
    name: "POS SaaS Platform",
    slug: "platform",
    status: "ACTIVE",
    planId: starterPlan.id,
    trialDays: starterPlan.trialDays,
    users: [{ name: "Super Admin", email: "superadmin@platform.local", role: "OWNER", isSuperAdmin: true }],
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
    ],
  });

  const t2 = await seedTenant({
    name: "Demo Mart",
    slug: "demo-mart",
    status: "TRIAL",
    planId: proPlan.id,
    trialDays: proPlan.trialDays,
    users: [
      { name: "Owner Mart", email: "owner@demo-mart.local", role: "OWNER" },
      { name: "Gudang Mart", email: "gudang@demo-mart.local", role: "WAREHOUSE" },
      { name: "Akuntan Mart", email: "akuntan@demo-mart.local", role: "ACCOUNTANT" },
      { name: "Manager Cabang", email: "manager@demo-mart.local", role: "BRANCH_MANAGER" },
    ],
  });

  console.log("[seed] Done");
  console.log(`[seed] Tenants: ${platform.slug}, ${t1.slug}, ${t2.slug}`);
  console.log(`[seed] Default password: ${seedPassword === DEFAULT_PASSWORD ? DEFAULT_PASSWORD : "(from SEED_PASSWORD)"}`);
}

main()
  .catch((e) => {
    console.error("[seed] Failed", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
