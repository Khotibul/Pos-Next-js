import { z } from "zod";

export const updateRolePermissionsSchema = z.object({
  roleId: z.string().min(5),
  permissionIds: z.array(z.string().min(5)).default([]),
});

export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;

