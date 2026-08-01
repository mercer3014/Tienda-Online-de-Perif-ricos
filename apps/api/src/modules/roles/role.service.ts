import type { UpdateRolePermissionsInput } from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

const MANAGE_ROLES_KEY = 'gestionar_roles';

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

export async function updateRolePermissions(
  roleId: string,
  input: UpdateRolePermissionsInput,
  userId: string,
  actorRoleId: string,
) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw notFound('Rol no encontrado');

  // Candado anti-lockout: nadie puede quitarle 'gestionar_roles' al rol con el
  // que inicio sesion, porque perderia la unica via de revertirlo desde el
  // panel (solo se arreglaria tocando la base de datos a mano). Quitarselo a
  // OTRO rol si esta permitido: el rol propio conserva el permiso.
  if (roleId === actorRoleId) {
    const manageRolesPerm = await prisma.permission.findUnique({ where: { key: MANAGE_ROLES_KEY } });
    const revokingOwnManageRoles =
      !!manageRolesPerm && input.entries.some((e) => e.permissionId === manageRolesPerm.id && !e.allowed);
    if (revokingOwnManageRoles) {
      throw forbidden(
        'No podes quitarle el permiso de gestionar roles al rol con el que iniciaste sesion. Pedile a otro administrador que lo haga.',
      );
    }
  }

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
