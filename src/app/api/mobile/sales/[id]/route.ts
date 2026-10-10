import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/mobile/sales/:id — hapus penjualan + restok + bersihkan piutang & rekap shift
// (cerminan deleteSaleById di website agar kedua platform konsisten)
export const DELETE = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;

  const existing = await prisma.sale.findFirst({
    where: { id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "Penjualan tidak ditemukan." },
      { status: 404 },
    );
  }

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { tenantId: auth.tenantId, id },
      select: {
        id: true,
        shiftId: true,
        status: true,
        total: true,
        items: { select: { productId: true, qty: true } },
      },
    });
    if (!sale) return;

    const warehouses = await tx.warehouse.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      select: { id: true },
    });
    const warehouseIds = warehouses.map((w) => w.id);

    // Kembalikan stok ke gudang
    if (warehouseIds.length > 0) {
      for (const item of sale.items) {
        const stockRows = await tx.productWarehouseStock.findMany({
          where: { tenantId: auth.tenantId, productId: item.productId, warehouseId: { in: warehouseIds } },
          orderBy: { updatedAt: "asc" },
          select: { id: true },
        });
        let remaining = Number(item.qty);
        for (const row of stockRows) {
          if (remaining <= 0) break;
          await tx.productWarehouseStock.update({
            where: { id: row.id },
            data: { qty: { increment: remaining } },
          });
          remaining = 0;
        }
      }
    }

    // Penjualan kredit → hapus piutang terkait
    if (sale.status === "CREDIT") {
      await tx.receivable.deleteMany({ where: { saleId: sale.id } });
    }

    // Kurangi rekap shift yang masih OPEN
    if (sale.shiftId) {
      const payment = await tx.payment.findFirst({
        where: { saleId: sale.id },
        select: { method: true, amount: true },
      });
      const method = payment?.method ?? "CASH";
      const amount = Number(payment?.amount ?? sale.total);
      const isCash = method === "CASH" ? amount : 0;
      const isQris = method === "QRIS" ? amount : 0;
      const isTransfer = method === "TRANSFER" || method === "CARD" ? amount : 0;
      const isEwallet = method === "EWALLET" ? amount : 0;
      await tx.cashierShift.updateMany({
        where: { id: sale.shiftId, status: "OPEN" },
        data: {
          totalSales: { decrement: Number(sale.total) },
          transactionCount: { decrement: 1 },
          cashSystem: { decrement: isCash },
          totalCash: { decrement: isCash },
          totalQris: { decrement: isQris },
          totalTransfer: { decrement: isTransfer },
          totalEwallet: { decrement: isEwallet },
        },
      });
    }

    await tx.sale.delete({ where: { id: sale.id } });
  });

  return apiOk({ id, deleted: true });
});
