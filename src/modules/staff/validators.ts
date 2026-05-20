import { z } from "zod";

export const upsertStaffSchema = z.object({
  id: z.string().trim().min(1).optional(), // tenantUserId
  name: z.string().trim().min(2, "Nama wajib diisi.").max(120, "Maksimal 120 karakter."),
  email: z.string().trim().email("Email tidak valid.").max(190),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  roleId: z.string().trim().min(1, "Role wajib dipilih."),
  branchId: z.string().trim().optional().or(z.literal("")),
  password: z.string().trim().min(8, "Minimal 8 karakter.").max(200).optional().or(z.literal("")),
});

export type UpsertStaffInput = z.infer<typeof upsertStaffSchema>;

