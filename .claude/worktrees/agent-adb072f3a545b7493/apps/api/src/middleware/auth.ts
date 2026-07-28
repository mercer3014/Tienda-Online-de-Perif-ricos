import type { NextFunction, Request, Response } from 'express';
import type { PermissionKey } from '@villano/shared-types';
import { prisma } from '../lib/prisma.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { verifyToken } from '../lib/jwt.js';

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  role: { id: string; name: string };
  permissions: Set<string>;
}

const CTX = Symbol('authContext');

export const getAuth = (req: Request): AuthContext => {
  const ctx = (req as Request & { [CTX]?: AuthContext })[CTX];
  if (!ctx) throw unauthorized();
  return ctx;
};

/**
 * Exige un JWT valido. Carga el usuario, su rol y los permisos PERMITIDOS
 * (allowed=true) desde la matriz role_permissions en cada request, de modo
 * que un cambio de permisos surte efecto inmediato (no confia en el token).
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized('Falta el token de autenticacion');

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw unauthorized('Token invalido o expirado');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            permissions: { where: { allowed: true }, include: { permission: true } },
          },
        },
      },
    });

    if (!user || !user.active) throw unauthorized('Usuario inexistente o inactivo');

    const permissions = new Set(user.role.permissions.map((rp) => rp.permission.key));
    (req as Request & { [CTX]?: AuthContext })[CTX] = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: { id: user.role.id, name: user.role.name },
      permissions,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Exige un permiso especifico. Debe ir SIEMPRE despues de requireAuth.
 * Esta es la barrera real: el frontend puede ocultar botones, pero aqui
 * se bloquea de verdad.
 */
export const requirePermission =
  (key: PermissionKey) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const ctx = getAuth(req);
      if (!ctx.permissions.has(key)) {
        throw forbidden(`Requiere el permiso: ${key}`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
