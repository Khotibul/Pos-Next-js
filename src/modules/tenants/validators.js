import { z } from "zod";

function emptyToUndefined(v) {
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t === "" ? undefined : t;
}

export const createTenantFromOnboardingSchema = z.object({
  tenantName: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(120).optional()),
  serial: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(6, "Serial minimal 6 karakter.").max(80, "Serial terlalu panjang.").optional(),
  ),
  planSlug: z.string().trim().min(2).max(40).optional(),
});
