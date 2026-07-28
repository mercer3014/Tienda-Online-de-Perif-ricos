import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export async function listAudit(params: {
  userId?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.AuditLogWhereInput = {};
  if (params.userId) where.userId = params.userId;
  if (params.entityType) where.entityType = params.entityType;
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = new Date(params.from);
    if (params.to) where.createdAt.lte = new Date(params.to);
  }

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      user: r.user ? { id: r.user.id, name: r.user.name, email: r.user.email } : null,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      oldValue: r.oldValue,
      newValue: r.newValue,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  };
}

/** Version sin paginar de listAudit, para exportacion a CSV. Tope duro de 5000 filas. */
export async function listAuditForExport(params: {
  userId?: string;
  entityType?: string;
  from?: string;
  to?: string;
}) {
  const where: Prisma.AuditLogWhereInput = {};
  if (params.userId) where.userId = params.userId;
  if (params.entityType) where.entityType = params.entityType;
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = new Date(params.from);
    if (params.to) where.createdAt.lte = new Date(params.to);
  }

  const rows = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  return rows.map((r) => ({
    id: r.id,
    user: r.user ? { id: r.user.id, name: r.user.name, email: r.user.email } : null,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    createdAt: r.createdAt.toISOString(),
  }));
}
