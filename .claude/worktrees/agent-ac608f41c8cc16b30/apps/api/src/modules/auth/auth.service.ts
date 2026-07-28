import type { AuthUser, LoginInput, LoginResponse, PermissionKey } from '@villano/shared-types';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { unauthorized } from '../../lib/errors.js';
import { signToken } from '../../lib/jwt.js';

async function loadAuthUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      role: { include: { permissions: { where: { allowed: true }, include: { permission: true } } } },
    },
  });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: { id: user.role.id, name: user.role.name },
    permissions: user.role.permissions.map((rp) => rp.permission.key as PermissionKey),
  };
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Mensaje generico para no revelar si el email existe.
  if (!user || !user.active) throw unauthorized('Credenciales invalidas');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw unauthorized('Credenciales invalidas');

  const token = signToken({ sub: user.id, email: user.email, roleId: user.roleId });
  const authUser = await loadAuthUser(user.id);
  return { token, user: authUser };
}

export const getMe = (userId: string) => loadAuthUser(userId);
