import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertStaffInput } from "@/modules/staff/validators";
import { createEmailVerificationToken } from "@/modules/auth/email-verification/service";

export async function listStaff(params: { tenantId: string; q?: string | null }) {
  const q = params.q?.trim() || null;
  const where = {
    tenantId: params.tenantId,
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q } } },
            { user: { email: { contains: q } } },
            { role: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const items = await prisma.tenantUser.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, phone: true, emailVerified: true } },
      role: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  return { items, q };
}

export async function upsertStaff(params: { tenantId: string; input: UpsertStaffInput }) {
  const email = params.input.email.toLowerCase();
  const phone = params.input.phone?.trim() ? params.input.phone.trim() : null;
  const branchId = params.input.branchId?.trim() ? params.input.branchId.trim() : null;
  const password = params.input.password?.trim() ? params.input.password.trim() : null;

  // Validate role belongs to tenant.
  const role = await prisma.role.findFirst({
    where: { tenantId: params.tenantId, id: params.input.roleId },
    select: { id: true, name: true },
  });
  if (!role) throw Errors.badRequest("Role tidak valid.");

  if (branchId) {
    const branch = await prisma.branch.findFirst({ where: { tenantId: params.tenantId, id: branchId }, select: { id: true } });
    if (!branch) throw Errors.badRequest("Cabang tidak valid.");
  }

  if (params.input.id) {
    const membership = await prisma.tenantUser.findFirst({
      where: { tenantId: params.tenantId, id: params.input.id },
      select: { id: true, userId: true, user: { select: { email: true } } },
    });
    if (!membership) throw Errors.notFound("Akun pegawai tidak ditemukan.");

    if (membership.user.email && membership.user.email !== email) {
      const collision = await prisma.user.findFirst({ where: { email }, select: { id: true } }).catch(() => null);
      if (collision && collision.id !== membership.userId) throw Errors.badRequest("Email sudah digunakan user lain.");
    }

    const updates = await prisma.$transaction(async (tx) => {
      const userUpdate = await tx.user.update({
        where: { id: membership.userId },
        data: {
          name: params.input.name,
          phone,
          // email change is allowed only if it doesn't collide.
          email: email,
          ...(password ? { passwordHash: await bcrypt.hash(password, 12), emailVerified: null } : {}),
        },
        select: { id: true, email: true, name: true, emailVerified: true },
      });

      const memUpdate = await tx.tenantUser.update({
        where: { id: membership.id },
        data: {
          roleId: role.id,
          branchId,
        },
        select: { id: true },
      });

      return { membershipId: memUpdate.id, user: userUpdate };
    });

    // If password is reset (emailVerified cleared), send verification email.
    if (password) {
      await createEmailVerificationToken({ userId: updates.user.id, email: updates.user.email ?? email, userName: updates.user.name ?? null }).catch(() => {});
    }

    return { id: updates.membershipId };
  }

  // Create new staff membership.
  const existingUser = await prisma.user
    .findUnique({ where: { email }, select: { id: true, passwordHash: true, accounts: { select: { provider: true } } } })
    .catch(() => null);
  if (existingUser) {
    const existsMembership = await prisma.tenantUser.findFirst({
      where: { tenantId: params.tenantId, userId: existingUser.id },
      select: { id: true },
    });
    if (existsMembership) throw Errors.badRequest("User ini sudah terdaftar pada tenant.");
  }

  const canLoginWithoutPassword = Boolean(existingUser?.accounts?.length);
  if (!password && !existingUser?.passwordHash && !canLoginWithoutPassword) {
    throw Errors.badRequest("Password wajib diisi untuk akun baru.");
  }

  const created = await prisma.$transaction(async (tx) => {
    const user =
      existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: { name: params.input.name, phone, ...(password ? { passwordHash: await bcrypt.hash(password, 12), emailVerified: null } : {}) },
            select: { id: true, email: true, name: true, emailVerified: true },
          })
        : await tx.user.create({
            data: {
              name: params.input.name,
              email,
              phone,
              passwordHash: password ? await bcrypt.hash(password, 12) : null,
              emailVerified: null,
            },
            select: { id: true, email: true, name: true, emailVerified: true },
          });

    const membership = await tx.tenantUser.create({
      data: {
        tenantId: params.tenantId,
        userId: user.id,
        roleId: role.id,
        branchId,
      },
      select: { id: true },
    });

    return { membershipId: membership.id, user };
  });

  // Always require verification for credential accounts; send verification email best-effort.
  await createEmailVerificationToken({ userId: created.user.id, email: created.user.email ?? email, userName: created.user.name ?? null }).catch(() => {});

  return { id: created.membershipId };
}

export async function deleteStaff(params: { tenantId: string; id: string }) {
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
    select: { id: true, userId: true },
  });
  if (!membership) throw Errors.notFound("Akun pegawai tidak ditemukan.");

  await prisma.tenantUser.delete({ where: { id: membership.id } });
}
