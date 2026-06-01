import { z } from "zod";

export const createRoleSchema = z.object({
  tenantId: z.string().optional(),
  name: z.string().trim().min(2, "Nama role minimal 2 karakter").max(80),
});

export const cloneRoleSchema = z.object({
  roleId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  tenantId: z.string().optional(),
});

export const deleteRoleSchema = z.object({
  roleId: z.string().min(1),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type CloneRoleInput = z.infer<typeof cloneRoleSchema>;
