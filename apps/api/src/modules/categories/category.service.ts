import { Prisma } from '@prisma/client';
import type { CategoryNode, CreateCategoryInput, MoveCategoryInput, UpdateCategoryInput } from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

type Row = {
  id: string; parentId: string | null; name: string; slug: string;
  isPromo: boolean; promoBadgeText: string | null; displayOrder: number; active: boolean;
  icon: string | null;
};

function buildTree(rows: Row[], counts: Map<string, number>): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  rows.forEach((r) =>
    byId.set(r.id, {
      id: r.id, name: r.name, slug: r.slug, parentId: r.parentId,
      isPromo: r.isPromo, promoBadgeText: r.promoBadgeText, displayOrder: r.displayOrder,
      icon: r.icon as CategoryNode['icon'],
      active: r.active, productCount: counts.get(r.id) ?? 0, children: [],
    }),
  );
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);

  // Acumula el conteo de productos de los descendientes en cada padre
  // (una categoria padre muestra el total disponible en su subarbol).
  const rollup = (node: CategoryNode): number => {
    const childrenTotal = node.children.reduce((sum, c) => sum + rollup(c), 0);
    node.productCount = (node.productCount ?? 0) + childrenTotal;
    return node.productCount;
  };
  roots.forEach(rollup);

  return roots;
}

// El arbol cambia con muy poca frecuencia (altas/bajas/reordenes de categoria
// son acciones de staff, no de trafico de usuarios), pero se lee en CADA
// request publica sin autenticar. Cachearlo brevemente evita 2 queries
// completas por visita al catalogo. Solo se cachea la version publica
// (includeInactive=false); la version admin siempre lee fresco.
const TREE_CACHE_TTL_MS = 60_000;
let treeCache: { data: CategoryNode[]; expiresAt: number } | null = null;

async function buildTreeFromDb(opts: { includeInactive?: boolean }): Promise<CategoryNode[]> {
  const rows = await prisma.category.findMany({
    where: opts.includeInactive ? {} : { active: true },
    orderBy: { displayOrder: 'asc' },
  });
  // Conteo de productos activos por categoria.
  const grouped = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { status: 'activo' },
    _count: { _all: true },
  });
  const counts = new Map(grouped.map((g) => [g.categoryId, g._count._all]));
  return buildTree(rows as Row[], counts);
}

export async function getCategoryTree(opts: { includeInactive?: boolean } = {}): Promise<CategoryNode[]> {
  if (opts.includeInactive) return buildTreeFromDb(opts);

  const now = Date.now();
  if (treeCache && treeCache.expiresAt > now) return treeCache.data;

  const data = await buildTreeFromDb(opts);
  treeCache = { data, expiresAt: now + TREE_CACHE_TTL_MS };
  return data;
}

// Mapa id -> hijos directos de TODAS las categorias (activas e inactivas), usado
// para resolver "categoria y descendientes" en filtros de listado. Se cachea con
// la misma estrategia que el arbol para no repetir la query en cada request.
let descendantsMapCache: { data: Map<string, string[]>; expiresAt: number } | null = null;

export async function getCategoryDescendantsMap(): Promise<Map<string, string[]>> {
  const now = Date.now();
  if (descendantsMapCache && descendantsMapCache.expiresAt > now) return descendantsMapCache.data;

  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const childrenOf = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parentId) continue;
    const arr = childrenOf.get(c.parentId) ?? [];
    arr.push(c.id);
    childrenOf.set(c.parentId, arr);
  }
  descendantsMapCache = { data: childrenOf, expiresAt: now + TREE_CACHE_TTL_MS };
  return childrenOf;
}

function invalidateCategoryCache(): void {
  treeCache = null;
  descendantsMapCache = null;
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const found = await prisma.category.findUnique({ where: { slug } });
  if (found && found.id !== exceptId) throw conflict('Ya existe una categoria con ese slug');
}

export async function createCategory(input: CreateCategoryInput, userId: string) {
  await assertSlugFree(input.slug);
  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent) throw badRequest('La categoria padre no existe');
  }
  const cat = await prisma.category.create({
    data: {
      name: input.name, slug: input.slug, parentId: input.parentId ?? null,
      isPromo: input.isPromo ?? false, promoBadgeText: input.promoBadgeText ?? null,
      displayOrder: input.displayOrder ?? 0, icon: input.icon ?? null,
    },
  });
  await writeAudit({ userId, action: 'crear_categoria', entityType: 'category', entityId: cat.id, newValue: { name: cat.name, slug: cat.slug } });
  invalidateCategoryCache();
  return cat;
}

export async function updateCategory(id: string, input: UpdateCategoryInput, userId: string) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound('Categoria no encontrada');
  if (input.slug) await assertSlugFree(input.slug, id);
  if (input.parentId) await preventCycle(id, input.parentId);

  const cat = await prisma.category.update({
    where: { id },
    data: {
      name: input.name, slug: input.slug, parentId: input.parentId,
      isPromo: input.isPromo, promoBadgeText: input.promoBadgeText, displayOrder: input.displayOrder,
      active: input.active, icon: input.icon,
    },
  });
  await writeAudit({
    userId, action: 'modificar_categoria', entityType: 'category', entityId: id,
    oldValue: { name: existing.name, slug: existing.slug, parentId: existing.parentId, isPromo: existing.isPromo, active: existing.active },
    newValue: { name: cat.name, slug: cat.slug, parentId: cat.parentId, isPromo: cat.isPromo, active: cat.active },
  });
  invalidateCategoryCache();
  return cat;
}

/** Evita crear un ciclo al reparentar (una categoria no puede ser su propia descendiente). */
async function preventCycle(id: string, newParentId: string) {
  if (id === newParentId) throw badRequest('Una categoria no puede ser su propio padre');
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const parentOf = new Map(all.map((c) => [c.id, c.parentId]));
  let cursor: string | null = newParentId;
  while (cursor) {
    if (cursor === id) throw badRequest('Movimiento invalido: generaria un ciclo en el arbol');
    cursor = parentOf.get(cursor) ?? null;
  }
}

export async function moveCategory(id: string, input: MoveCategoryInput, userId: string) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound('Categoria no encontrada');
  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent) throw badRequest('La categoria padre no existe');
    await preventCycle(id, input.parentId);
  }
  const cat = await prisma.category.update({
    where: { id },
    data: { parentId: input.parentId, displayOrder: input.displayOrder },
  });
  await writeAudit({
    userId, action: 'modificar_categoria', entityType: 'category', entityId: id,
    oldValue: { parentId: existing.parentId, displayOrder: existing.displayOrder },
    newValue: { parentId: cat.parentId, displayOrder: cat.displayOrder },
  });
  invalidateCategoryCache();
  return cat;
}

/** Visibilidad publica: active -> false. Bloquea si tiene subcategorias u productos activos. */
export async function softDeleteCategory(id: string, userId: string) {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { children: true, products: true } } },
  });
  if (!existing) throw notFound('Categoria no encontrada');
  // Idempotencia: repetir la accion no debe duplicar auditoria ni "exitos" falsos.
  if (!existing.active) throw conflict('La categoria ya esta oculta del catalogo');

  const activeChildren = await prisma.category.count({ where: { parentId: id, active: true } });
  if (activeChildren > 0) throw conflict('La categoria tiene subcategorias visibles');
  const activeProducts = await prisma.product.count({ where: { categoryId: id, status: 'activo' } });
  if (activeProducts > 0) throw conflict('La categoria tiene productos visibles');

  const cat = await prisma.category.update({ where: { id }, data: { active: false } });
  await writeAudit({ userId, action: 'ocultar_categoria', entityType: 'category', entityId: id, oldValue: { active: true }, newValue: { active: false } });
  invalidateCategoryCache();
  return cat;
}

/**
 * Borrado FISICO real. La FK de Product.categoryId (y la auto-referencia de
 * Category.parentId) es RESTRICT a proposito: nunca queremos borrar en
 * cascada productos/subcategorias al borrar una categoria. Se verifica ANTES
 * de intentar el delete (en vez de parsear el error de Postgres despues):
 * el RESTRICT nativo no siempre llega envuelto como PrismaClientKnownRequestError
 * con codigo P2003 (a veces Prisma lo entrega como error crudo del conector),
 * asi que confiar en detectar ese codigo es fragil.
 */
export async function deleteCategoryPermanently(id: string, userId: string) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound('Categoria no encontrada');

  const [childrenCount, productsCount] = await Promise.all([
    prisma.category.count({ where: { parentId: id } }),
    prisma.product.count({ where: { categoryId: id } }),
  ]);
  if (childrenCount > 0 || productsCount > 0) {
    throw conflict('No se puede eliminar: la categoria todavia tiene productos o subcategorias asociadas. Movelos o eliminalos primero.');
  }

  try {
    await prisma.category.delete({ where: { id } });
  } catch (err) {
    // Red de seguridad ante una carrera (se creo un producto/subcategoria
    // justo entre el chequeo y el delete): mismo mensaje amigable en vez del error crudo.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw conflict('No se puede eliminar: la categoria todavia tiene productos o subcategorias asociadas. Movelos o eliminalos primero.');
    }
    throw err;
  }

  await writeAudit({
    userId,
    action: 'eliminar_categoria_permanente',
    entityType: 'category',
    entityId: id,
    oldValue: { name: existing.name, slug: existing.slug },
  });
  invalidateCategoryCache();
  return { id };
}
