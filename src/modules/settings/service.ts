import "server-only";

import { prisma } from "@/lib/prisma";
import type { SettingKey } from "@/modules/settings/keys";
import type { Prisma } from "@prisma/client";

export async function getSetting(params: { tenantId: string; key: SettingKey }) {
  const row = await prisma.setting.findUnique({
    where: { tenantId_key: { tenantId: params.tenantId, key: params.key } },
    select: { value: true },
  });
  return row?.value ?? null;
}

export async function setSetting(params: { tenantId: string; key: SettingKey; value: unknown }) {
  const value = params.value as Prisma.InputJsonValue;
  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: params.tenantId, key: params.key } },
    update: { value },
    create: { tenantId: params.tenantId, key: params.key, value },
  });
}
