import type { CreateAttributeInput, CreateAttributeValueInput } from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { conflict, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

/** Lista atributos con sus valores (para filtros del catalogo y formularios admin). */
export async function listAttributes() {
  const attrs = await prisma.attribute.findMany({
    orderBy: { name: 'asc' },
    include: { values: { orderBy: { value: 'asc' } } },
  });
  return attrs.map((a) => ({
    id: a.id,
    name: a.name,
    values: a.values.map((v) => ({ id: v.id, value: v.value })),
  }));
}

export async function createAttribute(input: CreateAttributeInput, userId: string) {
  const attr = await prisma.attribute.create({ data: { name: input.name } });
  await writeAudit({ userId, action: 'crear_atributo', entityType: 'attribute', entityId: attr.id, newValue: { name: attr.name } });
  return attr;
}

/** Borrado FISICO (no hay borrado logico para atributos). Bloquea si algun valor esta en uso por variantes. */
export async function deleteAttribute(id: string, userId: string) {
  const existing = await prisma.attribute.findUnique({
    where: { id },
    include: { values: { include: { _count: { select: { variants: true } } } } },
  });
  if (!existing) throw notFound('Atributo no encontrado');

  const inUse = existing.values.some((v) => v._count.variants > 0);
  if (inUse) throw conflict('El atributo tiene valores en uso por variantes existentes');

  await prisma.attribute.delete({ where: { id } });
  await writeAudit({ userId, action: 'eliminar_atributo', entityType: 'attribute', entityId: id, oldValue: { name: existing.name } });
}

export async function createAttributeValue(attributeId: string, input: CreateAttributeValueInput, userId: string) {
  const attr = await prisma.attribute.findUnique({ where: { id: attributeId } });
  if (!attr) throw notFound('Atributo no encontrado');

  const val = await prisma.attributeValue.create({ data: { attributeId, value: input.value } });
  await writeAudit({ userId, action: 'crear_valor_atributo', entityType: 'attribute_value', entityId: val.id, newValue: { attributeId, value: val.value } });
  return val;
}

/** Bloquea si el valor esta en uso por alguna variante. */
export async function deleteAttributeValue(id: string, userId: string) {
  const existing = await prisma.attributeValue.findUnique({
    where: { id },
    include: { _count: { select: { variants: true } } },
  });
  if (!existing) throw notFound('Valor de atributo no encontrado');
  if (existing._count.variants > 0) throw conflict('El valor esta en uso por variantes existentes');

  await prisma.attributeValue.delete({ where: { id } });
  await writeAudit({ userId, action: 'eliminar_valor_atributo', entityType: 'attribute_value', entityId: id, oldValue: { attributeId: existing.attributeId, value: existing.value } });
}
