import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { DEFAULT_PERMISSIONS, DEFAULT_ROLE_PERMISSION_MATRIX, DEFAULT_ROLES } from "@/modules/rbac/defaults";

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function createTenantForExistingUser({ userId, tenantName, planSlug }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, memberships: { select: { tenantId: true }, take: 1 } },
  });
  if (!user) throw Errors.unauthorized("User tidak ditemukan.");
  if (user.memberships.length > 0) throw Errors.badRequest("Akun ini sudah terhubung ke tenant.");

  const baseSlug = slugify(tenantName);
  if (!baseSlug) throw Errors.badRequest("Nama bisnis tidak valid.");

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
      select: { id: true },
    });

    const roleMap = new Map();
    for (const roleName of DEFAULT_ROLES) {
      const role = await tx.role.upsert({
        where: { tenantId_name: { tenantId: createdTenant.id, name: roleName } },
        update: {},
        create: { tenantId: createdTenant.id, name: roleName },
      });
      roleMap.set(roleName, role.id);
    }

    const permMap = new Map();
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

    await tx.tenantUser.create({
      data: { tenantId: createdTenant.id, userId, roleId: roleMap.get("OWNER") },
      select: { id: true },
    });

    return createdTenant;
  });

  return tenant;
}

