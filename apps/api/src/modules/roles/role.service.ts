import type { UpdateRolePermissionsInput } from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { key: 'asc' } });
}

/** Roles con su matriz completa de permisos (allowed true/false por cada uno). */
export async function listRolesWithMatrix() {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { permissions: true, _count: { select: { users: true } } },
    }),
    prisma.permission.findMany({ orderBy: { key: 'asc' } }),
  ]);

  return roles.map((role) => {
    const allowedByPerm = new Map(role.permissions.map((rp) => [rp.permissionId, rp.allowed]));
    return {
      id: role.id,
      name: role.name,
      userCount: role._count.users,
      permissions: permissions.map((p) => ({
        permissionId: p.id,
        key: p.key,
        description: p.description,
        allowed: allowedByPerm.get(p.id) ?? false,
      })),
    };
  });
}

export async function updateRolePermissions(roleId: string, input: UpdateRolePermissionsInput, userId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw notFound('Rol no encontrado');

  const before = await prisma.rolePermission.findMany({ where: { roleId } });
  const beforeMap = new Map(before.map((rp) => [rp.permissionId, rp.allowed]));

  await prisma.$transaction(
    input.entries.map((e) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: e.permissionId } },
        update: { allowed: e.allowed },
        create: { roleId, permissionId: e.permissionId, allowed: e.allowed },
      }),
    ),
  );

  const changed = input.entries.filter((e) => beforeMap.get(e.permissionId) !== e.allowed);
  await writeAudit({
    userId,
    action: 'gestionar_roles',
    entityType: 'role',
    entityId: roleId,
    oldValue: { changed: changed.map((c) => ({ permissionId: c.permissionId, allowed: beforeMap.get(c.permissionId) ?? false })) },
    newValue: { changed: changed.map((c) => ({ permissionId: c.permissionId, allowed: c.allowed })) },
  });

  return listRolesWithMatrix();
}
