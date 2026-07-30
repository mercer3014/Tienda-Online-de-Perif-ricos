import type { Prisma } from '@prisma/client';
import { computeStockStatus, type ProductDetailDTO, type ProductListItemDTO, type StockStatus } from '@villano/shared-types';
import { toNumber } from '../../lib/money.js';

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    images: true;
    variants: { include: { attributeValues: { include: { attributeValue: { include: { attribute: true } } } } } };
  };
}>;

/** Estado de stock agregado del producto (el "mejor" disponible). */
function aggregateStock(variants: ProductWithRelations['variants']): StockStatus {
  const total = variants.reduce((s, v) => s + v.stockQuantity, 0);
  return computeStockStatus(total);
}

function fromPrice(p: ProductWithRelations): number {
  if (!p.variants.length) return toNumber(p.basePrice);
  return Math.min(...p.variants.map((v) => toNumber(v.price)));
}

function primaryImage(p: ProductWithRelations): string | null {
  const primary = p.images.find((i) => i.isPrimary) ?? p.images[0];
  return primary?.urlWebp ?? null;
}

/** Variante a agregar directo desde la card: la mas barata con stock, o la mas barata si todas estan agotadas. */
function defaultVariant(variants: ProductWithRelations['variants']) {
  if (!variants.length) return null;
  const withStock = variants.filter((v) => v.stockQuantity > 0);
  const pool = withStock.length ? withStock : variants;
  return pool.reduce((best, v) => (toNumber(v.price) < toNumber(best.price) ? v : best), pool[0]);
}

export function toListItem(p: ProductWithRelations): ProductListItemDTO {
  const dv = defaultVariant(p.variants);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    basePrice: toNumber(p.basePrice),
    originalPrice: p.originalPrice == null ? null : toNumber(p.originalPrice),
    status: p.status,
    categoryId: p.categoryId,
    categorySlug: p.category.slug,
    primaryImage: primaryImage(p),
    fromPrice: fromPrice(p),
    aggregateStock: aggregateStock(p.variants),
    variantCount: p.variants.length,
    defaultVariantId: dv?.id ?? null,
    defaultVariantStock: dv?.stockQuantity ?? 0,
  };
}

export function toDetail(p: ProductWithRelations): ProductDetailDTO {
  return {
    ...toListItem(p),
    description: p.description,
    categoryName: p.category.name,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    images: [...p.images]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((i) => ({
        id: i.id,
        urlWebp: i.urlWebp,
        displayOrder: i.displayOrder,
        isPrimary: i.isPrimary,
      })),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      price: toNumber(v.price),
      stockQuantity: v.stockQuantity,
      stockStatus: computeStockStatus(v.stockQuantity),
      attributes: v.attributeValues.map((av) => ({
        attribute: av.attributeValue.attribute.name,
        value: av.attributeValue.value,
        attributeValueId: av.attributeValueId,
      })),
    })),
  };
}

export const productInclude = {
  category: true,
  images: true,
  variants: {
    include: {
      attributeValues: { include: { attributeValue: { include: { attribute: true } } } },
    },
  },
} satisfies Prisma.ProductInclude;
