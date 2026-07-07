import "server-only";

import { Errors } from "@/shared/server/errors/app-error";
import { createSaleUseCase } from "@/features/transactions/domain/create-sale.usecase";
import { toSaleListItem, toSaleDetail } from "@/features/transactions/data/dto";
import * as repo from "@/features/transactions/data/repository";
import type { SaleListQuery, SaleListResult, SaleDetail } from "@/features/transactions/domain/entity";

export { createSaleUseCase as createSale };

export async function listSales(params: SaleListQuery): Promise<SaleListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));
  const q = params.q?.trim() || null;
  const status = params.status && (params.status === "PAID" || params.status === "VOID") ? params.status : null;

  const where = {
    tenantId: params.tenantId,
    ...(q ? { invoiceNo: { contains: q } } : {}),
    ...(status ? { status } : {}),
  };

  const [total, items] = await Promise.all([
    repo.countSales(where),
    repo.findSales(where, { createdAt: "desc" }, (page - 1) * pageSize, pageSize),
  ]);

  return { items: items.map(toSaleListItem), total, page, pageSize, q, status };
}

export async function getSaleById(params: { tenantId: string; id: string }): Promise<SaleDetail> {
  const record = await repo.findSaleDetail(params.tenantId, params.id);
  if (!record) throw Errors.notFound("Transaksi tidak ditemukan.");
  return toSaleDetail(record);
}

export async function deleteSaleById(id: string) {
  const { deleteSaleById: del } = await import("@/features/transactions/data/repository");
  await del(id);
}
