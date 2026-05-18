import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PERMISSIONS, DEFAULT_ROLE_PERMISSION_MATRIX, DEFAULT_ROLES } from "@/modules/rbac/defaults";

const registerSchema = z.object({
  tenantName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
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

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Data tidak valid." }, { status: 400 });
  }

  const { tenantName, ownerName, email, password, planSlug } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ message: "Email sudah terdaftar." }, { status: 409 });
  }

  const baseSlug = slugify(tenantName);
  if (!baseSlug) return NextResponse.json({ message: "Nama bisnis tidak valid." }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);

  const tenant = await prisma.$transaction(async (tx) => {
    const slugInUse = await tx.tenant.findUnique({ where: { slug: baseSlug } });
    const slug = slugInUse ? `${baseSlug}-${Math.random().toString(36).slice(2, 8)}` : baseSlug;

    const resolvedPlanSlug = (planSlug || "pro").toLowerCase();
    const plan = await tx.plan.findUnique({ where: { slug: resolvedPlanSlug } }).catch(() => null);
    const trialDays = plan?.trialDays ?? 14;
    const trialEndsAt = trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;

    const createdTenant = await tx.tenant.create({
      data: {
        name: tenantName,
        slug,
        planId: plan?.id ?? null,
        status: trialDays > 0 ? "TRIAL" : "ACTIVE",
        trialEndsAt,
      },
    });

    const roleMap = new Map<string, string>();
    for (const roleName of DEFAULT_ROLES) {
      const role = await tx.role.upsert({
        where: { tenantId_name: { tenantId: createdTenant.id, name: roleName } },
        update: {},
        create: { tenantId: createdTenant.id, name: roleName },
      });
      roleMap.set(roleName, role.id);
    }

    const permMap = new Map<string, string>();
    for (const p of DEFAULT_PERMISSIONS) {
      const perm = await tx.permission.upsert({
        where: { tenantId_key: { tenantId: createdTenant.id, key: p.key } },
        update: { name: p.name },
        create: { tenantId: createdTenant.id, key: p.key, name: p.name },
      });
      permMap.set(p.key, perm.id);
    }

    for (const roleName of DEFAULT_ROLES) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;
      for (const key of DEFAULT_ROLE_PERMISSION_MATRIX[roleName] ?? []) {
        const permissionId = permMap.get(key);
        if (!permissionId) continue;
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId } },
          update: {},
          create: { roleId, permissionId },
        });
      }
    }

    const user = await tx.user.create({
      data: { name: ownerName, email, passwordHash },
    });

    await tx.tenantUser.create({
      data: { tenantId: createdTenant.id, userId: user.id, roleId: roleMap.get("OWNER")! },
    });

    return createdTenant;
  });

  return NextResponse.json({ tenantId: tenant.id }, { status: 201 });
}
