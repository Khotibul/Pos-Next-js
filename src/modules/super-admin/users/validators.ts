import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.string().trim().email("Email tidak valid").transform((v) => v.toLowerCase()),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "Password minimal 8 karakter"),
  isSuperAdmin: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  emailVerified: z.coerce.boolean().default(false),
});

export const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  phone: z.string().trim().optional(),
  isSuperAdmin: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  emailVerified: z.coerce.boolean().default(false),
});

export const resetUserPasswordSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export const verifyUserEmailSchema = z.object({
  id: z.string().min(1),
});

export const assignTenantSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  roleId: z.string().min(1),
  branchId: z.string().optional(),
});

export const removeTenantSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
export type AssignTenantInput = z.infer<typeof assignTenantSchema>;
export type RemoveTenantInput = z.infer<typeof removeTenantSchema>;
