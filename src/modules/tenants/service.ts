import "server-only";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { DEFAULT_PERMISSIONS, DEFAULT_ROLE_PERMISSION_MATRIX, DEFAULT_ROLES } from "@/modules/rbac/defaults";

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

export async function createTenantForExistingUser({ userId, tenantName, planSlug }: { userId: string; tenantName: string | null; planSlug?: string | null }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, memberships: { select: { tenantId: true }, take: 1 } },
  });
  if (!user) throw Errors.unauthorized("User tidak ditemukan.");
  if (user.memberships.length > 0) throw Errors.badRequest("Akun ini sudah terhubung ke tenant.");

  const derivedTenantName =
    (tenantName && tenantName.trim()) ||
    (user.name && user.name.trim().length >= 2 ? `Bisnis ${user.name.trim()}` : null) ||
    (user.email ? `Bisnis ${user.email.split("@")[0]}` : null) ||
    "Bisnis Baru";

  const baseSlug = slugify(derivedTenantName) || `tenant-${userId.slice(0, 8)}`;

  const resolvedPlanSlug = (planSlug || "pro").toLowerCase();
  const plan = await prisma.plan.findUnique({ where: { slug: resolvedPlanSlug } }).catch(() => null);

  const trialDays = 30;
  const trialEndsAt = trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;

  async function createTenantWithSlug(slug: string) {
    return prisma.tenant.create({
      data: {
        name: derivedTenantName,
        slug,
        planId: plan?.id ?? null,
        status: trialDays > 0 ? "TRIAL" : "ACTIVE",
        trialEndsAt,
      },
      select: { id: true },
    });
  }

  let createdTenant;
  try {
    createdTenant = await createTenantWithSlug(baseSlug);
  } catch (e) {
    const err = e as { code?: string };
    if (err.code !== "P2002") throw e;
    const retrySlug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
    createdTenant = await createTenantWithSlug(retrySlug);
  }

  const branchId = makeId();

  const roleIdsByName = new Map<string, string>();
  const roleRows: Array<{ id: string; tenantId: string; name: string }> = [];
  for (const roleName of DEFAULT_ROLES) {
    const id = makeId();
    roleIdsByName.set(roleName, id);
    roleRows.push({ id, tenantId: createdTenant.id, name: roleName });
  }

  const permIdsByKey = new Map<string, string>();
  const permRows: Array<{ id: string; tenantId: string; key: string; name: string }> = [];
  for (const p of DEFAULT_PERMISSIONS) {
    const id = makeId();
    permIdsByKey.set(p.key, id);
    permRows.push({ id, tenantId: createdTenant.id, key: p.key, name: p.name });
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

  const ownerRoleId = roleIdsByName.get("OWNER") || null;

  await prisma.$transaction([
    prisma.role.createMany({ data: roleRows, skipDuplicates: true }),
    prisma.permission.createMany({ data: permRows, skipDuplicates: true }),
    ...(rolePermRows.length ? [prisma.rolePermission.createMany({ data: rolePermRows, skipDuplicates: true })] : []),
    prisma.branch.create({
      data: {
        id: branchId,
        tenantId: createdTenant.id,
        code: "MAIN",
        name: "Main Branch",
        isActive: true,
      },
    }),
    prisma.tenantUser.create({
      data: { tenantId: createdTenant.id, userId, roleId: ownerRoleId, branchId },
    }),
  ]);

  return createdTenant;
}
