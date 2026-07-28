import { z } from 'zod';
import { uuidSchema } from './common.js';
import { PermissionKey } from './enums.js';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres').max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
  roleId: uuidSchema,
  active: z.boolean().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).max(200).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** Fila de la matriz configurable de permisos. */
export const rolePermissionEntrySchema = z.object({
  permissionId: uuidSchema,
  allowed: z.boolean(),
});
export const updateRolePermissionsSchema = z.object({
  entries: z.array(rolePermissionEntrySchema).min(1),
});
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;

/** Perfil devuelto tras login / GET /auth/me (NUNCA incluye password_hash). */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: { id: string; name: string };
  permissions: PermissionKey[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
