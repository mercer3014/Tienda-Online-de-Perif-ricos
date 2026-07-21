import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

interface AuditInput {
  userId: string;
  action: string; // p.ej. "crear_producto", "editar_precio"
  entityType: string; // p.ej. "product", "variant", "category", "role"
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Registra un cambio en audit_log. Nunca lanza: una falla al auditar no debe
 * tumbar la operacion principal (pero se loguea en consola del servidor).
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        oldValue: (input.oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
        newValue: (input.newValue ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[AUDIT] no se pudo registrar', input.action, e);
  }
}
