import type { CreateProductInput, UpdateProductInput } from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { deleteProductImage } from '../../lib/imageStorage.js';
import { productInclude, toDetail } from './product.serializer.js';
import { toNumber } from '../../lib/money.js';

async function ensureCategory(categoryId: string) {
  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat || !cat.active) throw notFound('Categoria no encontrada');
}

export async function adminListProducts(params: { search?: string; page: number; pageSize: number }) {
  const where = params.search
    ? {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' as const } },
          { brand: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);
  return { items: rows.map(toDetail), total };
}

export async function createProduct(input: CreateProductInput, userId: string) {
  await ensureCategory(input.categoryId);
  const product = await prisma.product.create({
    data: {
      categoryId: input.categoryId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? '',
      brand: input.brand ?? null,
      basePrice: input.basePrice,
      originalPrice: input.originalPrice ?? null,
      status: input.status ?? 'activo',
    },
    include: productInclude,
  });
  await writeAudit({
    userId,
    action: 'crear_producto',
    entityType: 'product',
    entityId: product.id,
    newValue: { name: product.name, slug: product.slug, basePrice: toNumber(product.basePrice) },
  });
  return toDetail(product);
}

export async function updateProduct(id: string, input: UpdateProductInput, userId: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw notFound('Producto no encontrado');
  if (input.categoryId) await ensureCategory(input.categoryId);

  // El schema Zod solo valida originalPrice > basePrice cuando ambos vienen en
  // el mismo payload; en un PATCH parcial hay que comparar contra el valor
  // ya guardado para no permitir una "oferta" que en realidad sube el precio.
  const nextBasePrice = input.basePrice ?? toNumber(existing.basePrice);
  const nextOriginalPrice = input.originalPrice === undefined ? toNumber(existing.originalPrice) || null : input.originalPrice;
  if (nextOriginalPrice != null && nextOriginalPrice <= nextBasePrice) {
    throw badRequest('El precio de oferta (antes) debe ser mayor al precio actual');
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      categoryId: input.categoryId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      brand: input.brand,
      basePrice: input.basePrice,
      originalPrice: input.originalPrice,
      status: input.status,
    },
    include: productInclude,
  });

  // Auditoria diferenciada: si cambio el precio base, registrar editar_precio.
  if (input.basePrice != null && toNumber(existing.basePrice) !== input.basePrice) {
    await writeAudit({
      userId,
      action: 'editar_precio',
      entityType: 'product',
      entityId: id,
      oldValue: { basePrice: toNumber(existing.basePrice) },
      newValue: { basePrice: input.basePrice },
    });
  }
  await writeAudit({
    userId,
    action: 'editar_producto',
    entityType: 'product',
    entityId: id,
    oldValue: { name: existing.name, status: existing.status, basePrice: toNumber(existing.basePrice) },
    newValue: { name: updated.name, status: updated.status, basePrice: toNumber(updated.basePrice) },
  });
  return toDetail(updated);
}

/** Visibilidad publica: status -> inactivo. El producto NO se borra, solo se oculta del catalogo. */
export async function softDeleteProduct(id: string, userId: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw notFound('Producto no encontrado');
  // Idempotencia: no repetir auditoria si ya esta oculto.
  if (existing.status === 'inactivo') throw conflict('El producto ya esta oculto del catalogo');
  const updated = await prisma.product.update({
    where: { id },
    data: { status: 'inactivo' },
    include: productInclude,
  });
  await writeAudit({
    userId,
    action: 'ocultar_producto',
    entityType: 'product',
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: 'inactivo' },
  });
  return toDetail(updated);
}

/**
 * Borrado FISICO real: elimina el producto de la base (cascada a variantes,
 * imagenes y eventos de metricas) y los archivos de imagen en disco. Los
 * pedidos ya realizados NO se ven afectados: OrderItem guarda un snapshot
 * (nombre/precio) independiente y su variantId queda en null (onDelete: SetNull).
 */
export async function deleteProductPermanently(id: string, userId: string) {
  const existing = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!existing) throw notFound('Producto no encontrado');

  await prisma.product.delete({ where: { id } });

  await Promise.all(existing.images.map((img) => deleteProductImage(img.urlWebp)));

  await writeAudit({
    userId,
    action: 'eliminar_producto_permanente',
    entityType: 'product',
    entityId: id,
    oldValue: { name: existing.name, slug: existing.slug },
  });
  return { id };
}
