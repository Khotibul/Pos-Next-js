import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertPlanInput } from "@/modules/plans/validators";

export type PlanListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  priceMonthly: unknown;
  trialDays: number;
  isPopular: boolean;
  isActive: boolean;
  updatedAt: Date;
};

export async function listPlans() {
  const items = await prisma.plan.findMany({
    orderBy: [{ isPopular: "desc" }, { priceMonthly: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      currency: true,
      priceMonthly: true,
      trialDays: true,
      isPopular: true,
      isActive: true,
      updatedAt: true,
    },
  });
  return items as PlanListItem[];
}

export async function getActivePlans() {
  const items = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: [{ isPopular: "desc" }, { priceMonthly: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      currency: true,
      priceMonthly: true,
      trialDays: true,
      isPopular: true,
    },
  });
  return items;
}

export async function getPlanBySlug(slug: string) {
  const plan = await prisma.plan.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, trialDays: true, isActive: true } });
  if (!plan) throw Errors.notFound("Paket tidak ditemukan.");
  if (!plan.isActive) throw Errors.badRequest("Paket tidak aktif.");
  return plan;
}

export async function upsertPlan(input: UpsertPlanInput) {
  const data = {
    slug: input.slug,
    name: input.name,
    description: input.description ?? null,
    currency: input.currency,
    priceMonthly: input.priceMonthly,
    trialDays: input.trialDays,
    isPopular: input.isPopular ?? false,
    isActive: input.isActive ?? true,
  };

  if (input.id) {
    const exists = await prisma.plan.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!exists) throw Errors.notFound("Paket tidak ditemukan.");
    return prisma.plan.update({ where: { id: input.id }, data, select: { id: true } });
  }

  return prisma.plan.create({ data, select: { id: true } });
}

export async function deletePlan(id: string) {
  const exists = await prisma.plan.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Paket tidak ditemukan.");
  const tenantsUsing = await prisma.tenant.count({ where: { planId: id } });
  if (tenantsUsing > 0) throw Errors.badRequest("Paket masih digunakan oleh tenant. Nonaktifkan saja.");
  await prisma.plan.delete({ where: { id } });
}

