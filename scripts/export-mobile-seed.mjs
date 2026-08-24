/**
 * Export data tenant dari database sistem (Neon) menjadi file seed JSON
 * yang dibundel ke aplikasi posqu-mobile-lite.
 *
 * Pemakaian:
 *   node scripts/export-mobile-seed.mjs --email khotibul185@gmail.com
 *   node scripts/export-mobile-seed.mjs --tenant demo-resto
 *
 * Output: posqu-mobile-lite/assets/seed/initial_data.json
 */
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

function num(v) {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

async function main() {
  const email = arg("email");
  const tenantSlug = arg("tenant");

  let tenant = null;
  if (tenantSlug) {
    tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  } else if (email) {
    const membership = await prisma.tenantUser.findFirst({
      where: { user: { email } },
      include: { tenant: true },
    });
    tenant = membership?.tenant ?? null;
  }
  if (!tenant) {
    console.error("Tenant tidak ditemukan. Gunakan --email atau --tenant.");
    process.exit(1);
  }
  console.log(`[export] Tenant: ${tenant.name} (${tenant.slug})`);

  const [categories, products, customers, suppliers, sales] =
    await Promise.all([
      prisma.productCategory.findMany({
        where: { tenantId: tenant.id },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { tenantId: tenant.id },
        include: { category: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.customer.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
      prisma.supplier.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
      prisma.sale.findMany({
        where: { tenantId: tenant.id },
        include: {
          items: true,
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    products: products.map((p) => ({
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      barcode: p.barcode,
      qrCode: p.qrCode,
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? null,
      brandId: p.brandId,
      supplierId: p.supplierId,
      unitId: p.unitId,
      costPrice: num(p.costPrice),
      sellingPrice: num(p.sellingPrice),
      marginPct: num(p.marginPct),
      taxRate: num(p.taxRate),
      weight: num(p.weight),
      volume: num(p.volume),
      minStock: num(p.minStock),
      reorderPoint: num(p.reorderPoint),
      wholesalePrice: num(p.wholesalePrice),
      wholesaleDiscountPercent: num(p.wholesaleDiscountPercent),
      wholesaleMinQty: p.wholesaleMinQty ?? 0,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      isConsignment: p.isConsignment,
      type: p.type,
      unit: p.unit?.name ?? "pcs",
      stock: 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      isActive: c.isActive,
      city: null,
      totalPurchase: 0,
      purchaseCount: 0,
      points: 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      address: s.address,
      isActive: s.isActive,
      city: null,
      contactPerson: null,
      npwp: null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    sales: sales.map((s) => {
      const payment = s.payments[0];
      return {
        id: s.id,
        invoiceNo: s.invoiceNo,
        cashierId: s.cashierId,
        shiftId: s.shiftId,
        customerId: null,
        status: s.status,
        subtotal: num(s.subtotal),
        discount: num(s.discount),
        tax: num(s.tax),
        total: num(s.total),
        paidAmount: payment ? num(payment.receivedAmount) : num(s.total),
        changeAmount: payment ? num(payment.changeAmount) : 0,
        paymentMethod: payment ? payment.method.toLowerCase() : "cash",
        paymentReference: payment?.reference ?? null,
        notes: null,
        isSynced: true,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        items: s.items.map((i) => ({
          id: i.id,
          saleId: i.saleId,
          productId: i.productId,
          name: i.name,
          sku: i.sku,
          price: num(i.price),
          qty: num(i.qty),
          lineTotal: num(i.lineTotal),
        })),
      };
    }),
  };

  const outDir = path.resolve("posqu-mobile-lite/assets/seed");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "initial_data.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");

  // Password hash untuk akun admin lokal (sha256 admin123) - hanya info
  void bcrypt;

  console.log(
    `[export] Selesai -> ${outPath}\n` +
      `  kategori=${payload.categories.length} produk=${payload.products.length} ` +
      `pelanggan=${payload.customers.length} pemasok=${payload.suppliers.length} penjualan=${payload.sales.length}`,
  );
}

main()
  .catch((e) => {
    console.error("[export] Gagal:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
