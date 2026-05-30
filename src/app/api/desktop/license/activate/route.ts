import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeSerial } from "@/lib/licenses";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  serial: z.string().min(6),
  deviceId: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Input tidak valid." }, { status: 400 });
    }

    const serial = normalizeSerial(parsed.data.serial);
    const deviceId = String(parsed.data.deviceId).trim();
    const limit = await checkRateLimit("licenseActivation", deviceId);
    if (!limit.success) {
      return NextResponse.json({ ok: false, message: "Terlalu banyak percobaan aktivasi lisensi." }, { status: 429 });
    }

    const lic = await prisma.licenseKey.findUnique({
      where: { serial },
      select: {
        serial: true,
        expiresAt: true,
        revokedAt: true,
        tenantId: true,
        plan: { select: { slug: true, name: true } },
        tenant: { select: { id: true, name: true, plan: { select: { slug: true } }, trialEndsAt: true } },
      },
    });

    if (!lic) return NextResponse.json({ ok: false, message: "Serial number tidak ditemukan." }, { status: 404 });
    if (lic.revokedAt) return NextResponse.json({ ok: false, message: "Serial number sudah dinonaktifkan." }, { status: 400 });
    if (lic.expiresAt && lic.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ ok: false, message: "Serial number sudah kedaluwarsa." }, { status: 400 });
    }

    const tenantId = lic.tenant?.id ?? lic.tenantId ?? null;
    const companyName = lic.tenant?.name ?? "POS Desktop";
    const planType = lic.plan?.slug ?? lic.tenant?.plan?.slug ?? "trial";
    const expiredDate =
      (lic.expiresAt ?? lic.tenant?.trialEndsAt ?? null)?.toISOString?.() ??
      null;

    // Desktop payload returned to Electron main process (will be encrypted locally).
    return NextResponse.json({
      ok: true,
      data: {
        payload: {
          licenseKey: serial,
          tenantId,
          companyName,
          ownerName: "",
          email: "",
          phone: "",
          expiredDate,
          maxUsers: 50,
          maxBranches: 10,
          planType,
          offlineGraceDays: 3,
          // echo for audit on client (not used for key derivation)
          deviceId,
        },
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}
