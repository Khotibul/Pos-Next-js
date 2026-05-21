import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { generateSerial, normalizeSerial } from "@/lib/licenses";

export async function redeemLicense(params: { tenantId: string; serial: string }) {
  const serial = normalizeSerial(params.serial);
  if (!serial) throw Errors.badRequest("Serial number tidak valid.");

  const license = await prisma.licenseKey.findUnique({
    where: { serial },
    select: {
      id: true,
      serial: true,
      planId: true,
      tenantId: true,
      expiresAt: true,
      revokedAt: true,
      redeemedAt: true,
    },
  });
  if (!license) throw Errors.badRequest("Serial number tidak ditemukan.");
  if (license.revokedAt) throw Errors.badRequest("Serial number sudah dinonaktifkan.");
  if (license.expiresAt && license.expiresAt.getTime() < Date.now()) throw Errors.badRequest("Serial number sudah kedaluwarsa.");
  if (license.tenantId && license.tenantId !== params.tenantId) throw Errors.badRequest("Serial number sudah digunakan tenant lain.");

  // Redeem + activate tenant.
  await prisma.$transaction([
    prisma.licenseKey.update({
      where: { id: license.id },
      data: { tenantId: params.tenantId, redeemedAt: new Date() },
    }),
    prisma.tenant.update({
      where: { id: params.tenantId },
      data: {
        status: "ACTIVE",
        trialEndsAt: null,
        suspendedAt: null,
        planId: license.planId ?? undefined,
      },
    }),
  ]);

  return { ok: true as const };
}

export async function listLicenses(params: { q?: string | null; page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));
  const q = params.q?.trim() || null;
  const where = q
    ? {
        OR: [
          { serial: { contains: normalizeSerial(q) } },
          { tenant: { name: { contains: q } } },
          { tenant: { slug: { contains: q } } },
        ],
      }
    : {};

  const [total, items] = await prisma.$transaction([
    prisma.licenseKey.count({ where }),
    prisma.licenseKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        serial: true,
        createdAt: true,
        redeemedAt: true,
        revokedAt: true,
        expiresAt: true,
        plan: { select: { slug: true, name: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return { items, total, page, pageSize, q };
}

export async function generateLicenses(params: { planSlug: string; qty: number; expiresAt?: Date | null }) {
  const plan = await prisma.plan.findUnique({ where: { slug: params.planSlug.toLowerCase() } }).catch(() => null);
  if (!plan) throw Errors.badRequest("Plan tidak valid.");

  const rows = [];
  for (let i = 0; i < params.qty; i++) {
    rows.push({
      serial: normalizeSerial(generateSerial("PPOS")),
      planId: plan.id,
      expiresAt: params.expiresAt ?? null,
    });
  }

  // Insert one-by-one to avoid collision errors; still fast for <=200.
  const created: Array<{ serial: string }> = [];
  for (const r of rows) {
    const row = await prisma.licenseKey.create({
      data: r,
      select: { serial: true },
    });
    created.push(row);
  }
  return created;
}

export async function revokeLicense(params: { id: string }) {
  const exists = await prisma.licenseKey.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Lisensi tidak ditemukan.");
  await prisma.licenseKey.update({ where: { id: params.id }, data: { revokedAt: new Date() } });
}
