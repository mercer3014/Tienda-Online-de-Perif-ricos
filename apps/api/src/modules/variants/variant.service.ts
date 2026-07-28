import type { CreateVariantInput, QuickUpdateVariantInput, UpdateVariantInput } from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { toNumber } from '../../lib/money.js';

async function ensureAttributeValues(ids: string[]) {
  if (!ids.length) return;
  const count = await prisma.attributeValue.count({ where: { id: { in: ids } } });
  if (count !== ids.length) throw badRequest('Uno o mas valores de atributo no existen');
}

export async function createVariant(productId: string, input: CreateVariantInput, userId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw notFound('Producto no encontrado');
  await ensureAttributeValues(input.attributeValueIds);

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      sku: input.sku,
      price: input.price,
      stockQuantity: input.stockQuantity,
      attributeValues: {
        create: input.attributeValueIds.map((attributeValueId) => ({ attributeValueId })),
      },
    },
  });
  await writeAudit({
    userId,
    action: 'crear_variante',
    entityType: 'variant',
    entityId: variant.id,
    newValue: { sku: variant.sku, price: toNumber(variant.price), stock: variant.stockQuantity },
  });
  return variant;
}

export async function updateVariant(id: string, input: UpdateVariantInput, userId: string) {
  const existing = await prisma.productVariant.findUnique({ where: { id } });
  if (!existing) throw notFound('Variante no encontrada');
  if (input.attributeValueIds) await ensureAttributeValues(input.attributeValueIds);

  const variant = await prisma.$transaction(async (tx) => {
    if (input.attributeValueIds) {
      await tx.variantAttributeValue.deleteMany({ where: { variantId: id } });
      await tx.variantAttributeValue.createMany({
        data: input.attributeValueIds.map((attributeValueId) => ({ variantId: id, attributeValueId })),
      });
    }
    return tx.productVariant.update({
      where: { id },
      data: { sku: input.sku, price: input.price, stockQuantity: input.stockQuantity },
    });
  });

  if (input.price != null && toNumber(existing.price) !== input.price) {
    await writeAudit({
      userId, action: 'editar_precio', entityType: 'variant', entityId: id,
      oldValue: { price: toNumber(existing.price) }, newValue: { price: input.price },
    });
  }
  if (input.stockQuantity != null && existing.stockQuantity !== input.stockQuantity) {
    await writeAudit({
      userId, action: 'editar_stock', entityType: 'variant', entityId: id,
      oldValue: { stock: existing.stockQuantity }, newValue: { stock: input.stockQuantity },
    });
  }
  return variant;
}

/** Edicion rapida de precio/stock desde el listado. */
export async function quickUpdateVariant(id: string, input: QuickUpdateVariantInput, userId: string) {
  const existing = await prisma.productVariant.findUnique({ where: { id } });
  if (!existing) throw notFound('Variante no encontrada');

  const variant = await prisma.productVariant.update({
    where: { id },
    data: { price: input.price, stockQuantity: input.stockQuantity },
  });
  if (input.price != null && toNumber(existing.price) !== input.price) {
    await writeAudit({
      userId, action: 'editar_precio', entityType: 'variant', entityId: id,
      oldValue: { price: toNumber(existing.price) }, newValue: { price: input.price },
    });
  }
  if (input.stockQuantity != null && existing.stockQuantity !== input.stockQuantity) {
    await writeAudit({
      userId, action: 'editar_stock', entityType: 'variant', entityId: id,
      oldValue: { stock: existing.stockQuantity }, newValue: { stock: input.stockQuantity },
    });
  }
  return variant;
}

export async function deleteVariant(id: string, userId: string) {
  const existing = await prisma.productVariant.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!existing) throw notFound('Variante no encontrada');

  // Si la variante ya figura en pedidos, no se elimina (integridad historica
  // de ventas reales); el onDelete SetNull preservaria el snapshot igual,
  // pero preferimos avisar y que el staff baje el stock a 0 en su lugar.
  if (existing._count.orderItems > 0) {
    throw conflict('No se puede eliminar: esta variante tiene pedidos asociados. Poné el stock en 0 en su lugar.');
  }

  await prisma.variantAttributeValue.deleteMany({ where: { variantId: id } });
  await prisma.productVariant.delete({ where: { id } });
  await writeAudit({
    userId, action: 'eliminar_variante', entityType: 'variant', entityId: id,
    oldValue: { sku: existing.sku },
  });
  return { id };
}
