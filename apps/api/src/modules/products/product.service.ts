import type { Prisma } from '@prisma/client';
import type { ListProductsQuery } from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { getCategoryDescendantsMap } from '../categories/category.service.js';
import { productInclude, toDetail, toListItem } from './product.serializer.js';

/** Devuelve el id de la categoria y todos sus descendientes (arbol). */
async function categoryAndDescendants(rootId: string): Promise<string[]> {
  // Reusa el mapa id -> hijos cacheado (misma query que arma el arbol de
  // categorias), en vez de volver a traer TODAS las categorias en cada
  // listado filtrado por categoria.
  const childrenOf = await getCategoryDescendantsMap();
  const result: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    result.push(id);
    for (const child of childrenOf.get(id) ?? []) stack.push(child);
  }
  return result;
}

export async function listProducts(q: ListProductsQuery, opts: { includeInactive?: boolean } = {}) {
  const where: Prisma.ProductWhereInput = {};
  const and: Prisma.ProductWhereInput[] = [];

  // Estado (catalogo publico solo ve activos).
  if (!opts.includeInactive) where.status = 'activo';
  else if (q.status) where.status = q.status;

  // Categoria (por slug o id) incluyendo subcategorias.
  let categoryId = q.categoryId;
  if (!categoryId && q.categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: q.categorySlug } });
    categoryId = cat?.id;
    if (!cat) return { items: [], total: 0 };
  }
  if (categoryId) {
    const ids = await categoryAndDescendants(categoryId);
    where.categoryId = { in: ids };
  }

  // Busqueda por nombre o marca.
  if (q.search) {
    and.push({
      OR: [
        { name: { contains: q.search, mode: 'insensitive' } },
        { brand: { contains: q.search, mode: 'insensitive' } },
      ],
    });
  }

  // Rango de precio (sobre variantes).
  if (q.minPrice != null || q.maxPrice != null) {
    const priceFilter: Prisma.DecimalFilter = {};
    if (q.minPrice != null) priceFilter.gte = q.minPrice;
    if (q.maxPrice != null) priceFilter.lte = q.maxPrice;
    and.push({ variants: { some: { price: priceFilter } } });
  }

  // Filtros por atributo, combinables (AND entre valores seleccionados).
  if (q.attributeValueIds.length) {
    for (const valueId of q.attributeValueIds) {
      and.push({ variants: { some: { attributeValues: { some: { attributeValueId: valueId } } } } });
    }
  }

  if (and.length) where.AND = and;

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    q.sort === 'precio_asc'
      ? { basePrice: 'asc' }
      : q.sort === 'precio_desc'
        ? { basePrice: 'desc' }
        : q.sort === 'nombre'
          ? { name: 'asc' }
          : { createdAt: 'desc' };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return { items: rows.map(toListItem), total };
}

export async function getProductBySlug(slug: string, opts: { includeInactive?: boolean } = {}) {
  const product = await prisma.product.findUnique({ where: { slug }, include: productInclude });
  if (!product || (!opts.includeInactive && product.status !== 'activo')) {
    throw notFound('Producto no encontrado');
  }
  return toDetail(product);
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!product) throw notFound('Producto no encontrado');
  return toDetail(product);
}
