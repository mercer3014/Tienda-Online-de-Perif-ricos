import type { CreateUserInput, UpdateUserInput } from '@villano/shared-types';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { env } from '../../config/env.js';

// Selector que NUNCA incluye password_hash.
const safeSelect = {
  id: true,
  name: true,
  email: true,
  active: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
} as const;

export async function listUsers() {
  return prisma.user.findMany({ select: safeSelect, orderBy: { createdAt: 'asc' } });
}

async function ensureRole(roleId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw badRequest('El rol indicado no existe');
}

export async function createUser(input: CreateUserInput, actorId: string) {
  await ensureRole(input.roleId);
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      roleId: input.roleId,
      active: input.active ?? true,
    },
    select: safeSelect,
  });
  await writeAudit({ userId: actorId, action: 'gestionar_usuarios', entityType: 'user', entityId: user.id, newValue: { email: user.email, role: user.role.name } });
  return user;
}

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound('Usuario no encontrado');
  if (input.roleId) await ensureRole(input.roleId);

  const data: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    roleId: input.roleId,
    active: input.active,
  };
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.update({ where: { id }, data, select: safeSelect });
  await writeAudit({
    userId: actorId, action: 'gestionar_usuarios', entityType: 'user', entityId: id,
    oldValue: { email: existing.email, active: existing.active },
    newValue: { email: user.email, active: user.active },
  });
  return user;
}

/** Baja logica: active = false (nunca DELETE fisico para preservar auditoria). */
export async function deactivateUser(id: string, actorId: string) {
  if (id === actorId) throw badRequest('No puedes desactivar tu propio usuario');
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound('Usuario no encontrado');
  // Idempotencia: no repetir auditoria si ya esta inactivo.
  if (!existing.active) throw badRequest('El usuario ya esta desactivado');
  const user = await prisma.user.update({ where: { id }, data: { active: false }, select: safeSelect });
  await writeAudit({ userId: actorId, action: 'gestionar_usuarios', entityType: 'user', entityId: id, oldValue: { active: true }, newValue: { active: false } });
  return user;
}
