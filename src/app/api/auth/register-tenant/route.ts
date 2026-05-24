import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PERMISSIONS, DEFAULT_ROLE_PERMISSION_MATRIX, DEFAULT_ROLES } from "@/modules/rbac/defaults";
import { createEmailVerificationToken } from "@/modules/auth/email-verification/service";

const registerSchema = z.object({
  tenantName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().min(6).max(32).optional(),
  password: z.string().min(8).max(200),
  planSlug: z.string().trim().min(2).max(40).optional(),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function makeId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Data tidak valid." }, { status: 400 });
  }

  const { tenantName, ownerName, email, phone, password, planSlug } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ message: "Email sudah terdaftar." }, { status: 409 });
  }

  const baseSlug = slugify(tenantName);
  if (!baseSlug) return NextResponse.json({ message: "Nama bisnis tidak valid." }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);

  const resolvedPlanSlug = (planSlug || "pro").toLowerCase();
  const plan = await prisma.plan.findUnique({ where: { slug: resolvedPlanSlug } }).catch(() => null);

  // Requirement: if tenant has no serial number yet, default to 30 days trial.
  const trialDays = 30;
  const trialEndsAt = trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;

  // Avoid interactive transactions (P2028) on serverless poolers (Neon/Vercel).
  // Pre-generate IDs so dependent writes can be done via `$transaction([])`.
  const tenantId = makeId();
  const userId = makeId();
  const branchId = makeId();

  const roleIdsByName = new Map<string, string>();
  const roleRows: Array<{ id: string; tenantId: string; name: string }> = [];
  for (const roleName of DEFAULT_ROLES) {
    const id = makeId();
    roleIdsByName.set(roleName, id);
    roleRows.push({ id, tenantId, name: roleName });
  }

  const permIdsByKey = new Map<string, string>();
  const permRows: Array<{ id: string; tenantId: string; key: string; name: string }> = [];
  for (const p of DEFAULT_PERMISSIONS) {
    const id = makeId();
    permIdsByKey.set(p.key, id);
    permRows.push({ id, tenantId, key: p.key, name: p.name });
  }

  const rolePermRows: Array<{ id: string; roleId: string; permissionId: string }> = [];
  for (const roleName of DEFAULT_ROLES) {
    const roleId = roleIdsByName.get(roleName);
    if (!roleId) continue;
    for (const key of DEFAULT_ROLE_PERMISSION_MATRIX[roleName] ?? []) {
      const permissionId = permIdsByKey.get(key);
      if (!permissionId) continue;
      rolePermRows.push({ id: makeId(), roleId, permissionId });
    }
  }

  const ownerRoleId = roleIdsByName.get("OWNER") ?? null;

  type CreatedTenant = { id: string; name: string; slug: string };
  type CreatedUser = { id: string; email: string | null; name: string | null };
  type PrismaErr = { code?: string; meta?: { target?: string[] | string } };

  const createAll = async (slug: string) => {
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.tenant.create({
        data: {
          id: tenantId,
          name: tenantName,
          slug,
          planId: plan?.id ?? null,
          status: trialDays > 0 ? "TRIAL" : "ACTIVE",
          trialEndsAt,
        },
        select: { id: true, name: true, slug: true },
      }),
      prisma.user.create({
        data: { id: userId, name: ownerName, email, phone: phone || null, passwordHash, emailVerified: null },
        select: { id: true, email: true, name: true },
      }),
      prisma.role.createMany({ data: roleRows, skipDuplicates: true }),
      prisma.permission.createMany({ data: permRows, skipDuplicates: true }),
    ];
    if (rolePermRows.length) ops.push(prisma.rolePermission.createMany({ data: rolePermRows, skipDuplicates: true }));

    // Create a default branch so the tenant can use POS immediately.
    ops.push(
      prisma.branch.create({
        data: {
          id: branchId,
          tenantId,
          code: "MAIN",
          name: "Main Branch",
          isActive: true,
        },
        select: { id: true },
      }),
    );
    ops.push(
      prisma.tenantUser.create({
        data: { tenantId, userId, roleId: ownerRoleId, branchId },
        select: { id: true },
      }),
    );

    const [tenant, user] = await prisma.$transaction(ops);
    return { tenant: tenant as CreatedTenant, user: user as CreatedUser };
  };

  // Keep slug nice if possible, otherwise fallback to random suffix.
  const slugInUse = await prisma.tenant.findUnique({ where: { slug: baseSlug }, select: { id: true } }).catch(() => null);
  const preferredSlug = slugInUse ? `${baseSlug}-${randomSuffix()}` : baseSlug;

  let created: { tenant: CreatedTenant; user: CreatedUser };
  try {
    created = await createAll(preferredSlug);
  } catch (e: unknown) {
    // If slug collides due to race, retry once with a new suffix.
    const err = e as PrismaErr;
    const rawTarget = err?.meta?.target;
    const target = Array.isArray(rawTarget) ? rawTarget : typeof rawTarget === "string" ? [rawTarget] : [];
    const isSlugCollision = err?.code === "P2002" && target.some((t) => String(t).includes("slug"));
    const isEmailCollision = err?.code === "P2002" && target.some((t) => String(t).includes("email"));
    if (isEmailCollision) {
      return NextResponse.json({ message: "Email sudah terdaftar." }, { status: 409 });
    }
    if (isSlugCollision) {
      created = await createAll(`${baseSlug}-${randomSuffix()}`);
    } else {
      throw e;
    }
  }

  // Send email verification after transaction commits (requires SMTP_* + EMAIL_FROM).
  // Do not silently swallow errors in production; return a flag so UI can guide users to resend.
  let verificationEmailSent = false;
  try {
    await createEmailVerificationToken({
      userId: created.user.id,
      email,
      userName: created.user.name ?? null,
    });
    verificationEmailSent = true;
  } catch (e: unknown) {
    // Keep registration successful, but inform UI so the user can retry via "Resend verification".
    const msg = e instanceof Error ? e.message : "Gagal mengirim email verifikasi.";
    return NextResponse.json(
      { tenantId: created.tenant.id, requiresEmailVerification: true, verificationEmailSent: false, message: msg },
      { status: 201 },
    );
  }

  return NextResponse.json(
    { tenantId: created.tenant.id, requiresEmailVerification: true, verificationEmailSent },
    { status: 201 },
  );
}
