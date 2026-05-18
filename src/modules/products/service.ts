import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { CreateProductInput, UpdateProductInput } from "@/modules/products/validators";

export async function listProducts(params: {
  tenantId: string;
  q?: string | null;
  categoryId?: string | null;
  status?: "active" | "inactive" | null;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));
  const q = params.q?.trim() || null;
  const categoryId = params.categoryId?.trim() || null;
  const status = params.status ?? null;

  const where = {
    tenantId: params.tenantId,
    ...(categoryId ? { categoryId } : {}),
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { sku: { contains: q } },
            { barcode: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sku: true,
        name: true,
        barcode: true,
        category: { select: { id: true, name: true } },
        costPrice: true,
        sellingPrice: true,
        isActive: true,
        updatedAt: true,
      },
    }),
  ]);

  return { items, total, page, pageSize, q, categoryId, status };
}

export async function getProductOverview(params: { tenantId: string }) {
  const [total, active, inactive, withBarcode] = await prisma.$transaction([
    prisma.product.count({ where: { tenantId: params.tenantId } }),
    prisma.product.count({ where: { tenantId: params.tenantId, isActive: true } }),
    prisma.product.count({ where: { tenantId: params.tenantId, isActive: false } }),
    prisma.product.count({ where: { tenantId: params.tenantId, barcode: { not: null } } }),
  ]);
  return { total, active, inactive, withBarcode };
}

export async function getProductById(params: { tenantId: string; id: string }) {
  const product = await prisma.product.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
  });
  if (!product) throw Errors.notFound("Produk tidak ditemukan.");
  return product;
}

export async function createProduct(params: { tenantId: string; input: CreateProductInput }) {
  const created = await prisma.product.create({
    data: {
      tenantId: params.tenantId,
      sku: params.input.sku,
      name: params.input.name,
      barcode: params.input.barcode || null,
      categoryId: params.input.categoryId || null,
      brandId: params.input.brandId || null,
      unitId: params.input.unitId || null,
      costPrice: params.input.costPrice,
      sellingPrice: params.input.sellingPrice,
      isActive: params.input.isActive ?? true,
    },
    select: { id: true },
  });
  return created;
}

export async function updateProduct(params: { tenantId: string; id: string; input: UpdateProductInput }) {
  const exists = await prisma.product.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
    select: { id: true },
  });
  if (!exists) throw Errors.notFound("Produk tidak ditemukan.");

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: {
      sku: params.input.sku,
      name: params.input.name,
      barcode: params.input.barcode === "" ? null : params.input.barcode,
      categoryId: params.input.categoryId === "" ? null : params.input.categoryId,
      brandId: params.input.brandId === "" ? null : params.input.brandId,
      unitId: params.input.unitId === "" ? null : params.input.unitId,
      costPrice: params.input.costPrice,
      sellingPrice: params.input.sellingPrice,
      isActive: params.input.isActive,
    },
    select: { id: true },
  });

  return updated;
}

export async function deleteProduct(params: { tenantId: string; id: string }) {
  const exists = await prisma.product.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
    select: { id: true },
  });
  if (!exists) throw Errors.notFound("Produk tidak ditemukan.");

  await prisma.product.delete({ where: { id: params.id } });
}

export async function listProductMeta(params: { tenantId: string }) {
  const [categories, brands, units] = await prisma.$transaction([
    prisma.productCategory.findMany({
      where: { tenantId: params.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.productBrand.findMany({
      where: { tenantId: params.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.productUnit.findMany({
      where: { tenantId: params.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { categories, brands, units };
}
