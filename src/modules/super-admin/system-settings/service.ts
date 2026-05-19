import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";

export async function listGlobalSettings() {
  return prisma.globalSetting.findMany({ orderBy: { key: "asc" } });
}

export async function upsertGlobalSetting(input: { id?: string; key: string; value: unknown }) {
  const key = input.key.trim();
  if (!key) throw Errors.badRequest("Key tidak valid.");

  if (input.id) {
    const exists = await prisma.globalSetting.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!exists) throw Errors.notFound("Setting tidak ditemukan.");
    return prisma.globalSetting.update({ where: { id: input.id }, data: { key, value: input.value as never }, select: { id: true } });
  }

  return prisma.globalSetting.create({ data: { key, value: input.value as never }, select: { id: true } });
}

export async function deleteGlobalSetting(id: string) {
  const exists = await prisma.globalSetting.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Setting tidak ditemukan.");
  await prisma.globalSetting.delete({ where: { id } });
  return { id };
}

