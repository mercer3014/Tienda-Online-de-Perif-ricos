import { z } from 'zod';
import { slugSchema, uuidSchema } from './common.js';
import { ProductStatus, StockStatus } from './enums.js';

/** ---- Variantes ---- */
export const variantAttributeInputSchema = z.object({
  attributeValueId: uuidSchema,
});

export const createVariantSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  price: z.coerce.number().positive().max(9_999_999),
  stockQuantity: z.coerce.number().int().min(0).max(1_000_000),
  attributeValueIds: z.array(uuidSchema).default([]),
});

export const updateVariantSchema = createVariantSchema.partial();

/** Edicion rapida de precio/stock desde el listado admin. */
export const quickUpdateVariantSchema = z
  .object({
    price: z.coerce.number().positive().max(9_999_999).optional(),
    stockQuantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  })
  .refine((v) => v.price !== undefined || v.stockQuantity !== undefined, {
    message: 'Debe enviar price o stockQuantity',
  });

/** ---- Productos ---- */
const productBaseSchema = z.object({
  categoryId: uuidSchema,
  name: z.string().trim().min(2).max(180),
  slug: slugSchema,
  description: z.string().trim().max(5000).default(''),
  brand: z.string().trim().max(80).nullable().optional(),
  basePrice: z.coerce.number().positive().max(9_999_999),
  // Precio "antes" (oferta). Debe ser mayor al precio actual si se envia.
  originalPrice: z.coerce.number().positive().max(9_999_999).nullable().optional(),
  status: ProductStatus.default('activo'),
});

// El refine se aplica solo cuando ambos precios vienen en el mismo payload
// (en un PATCH parcial que solo trae originalPrice, el servicio valida contra
// el basePrice ya guardado en la base).
const priceOrderRefinement = (data: { basePrice?: number; originalPrice?: number | null }) =>
  data.originalPrice == null || data.basePrice == null || data.originalPrice > data.basePrice;

export const createProductSchema = productBaseSchema.refine(priceOrderRefinement, {
  message: 'El precio de oferta (antes) debe ser mayor al precio actual',
  path: ['originalPrice'],
});

export const updateProductSchema = productBaseSchema.partial().refine(priceOrderRefinement, {
  message: 'El precio de oferta (antes) debe ser mayor al precio actual',
  path: ['originalPrice'],
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  categorySlug: z.string().optional(),
  categoryId: uuidSchema.optional(),
  search: z.string().trim().max(120).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  /** IDs de attribute_values para filtrar (combinables). CSV o repetido. */
  attributeValueIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return [] as string[];
      const arr = Array.isArray(v) ? v : v.split(',');
      return arr.map((s) => s.trim()).filter(Boolean);
    }),
  status: ProductStatus.optional(),
  sort: z.enum(['recientes', 'precio_asc', 'precio_desc', 'nombre']).default('recientes'),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type QuickUpdateVariantInput = z.infer<typeof quickUpdateVariantSchema>;

/** ---- DTOs de salida (lo que la API devuelve al catalogo) ---- */
export interface ProductImageDTO {
  id: string;
  urlWebp: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface VariantAttributeDTO {
  attribute: string;
  value: string;
  attributeValueId: string;
}

export interface VariantDTO {
  id: string;
  sku: string;
  price: number;
  stockQuantity: number;
  stockStatus: StockStatus;
  attributes: VariantAttributeDTO[];
}

export interface ProductListItemDTO {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  basePrice: number;
  /** Precio "antes" (oferta). Null si el producto no esta en promocion. */
  originalPrice: number | null;
  status: ProductStatus;
  categoryId: string;
  categorySlug: string;
  primaryImage: string | null;
  fromPrice: number;
  aggregateStock: StockStatus;
}

export interface ProductDetailDTO extends ProductListItemDTO {
  description: string;
  categoryName: string;
  images: ProductImageDTO[];
  variants: VariantDTO[];
  createdAt: string;
  updatedAt: string;
}
