import { z } from 'zod';
import { slugSchema, uuidSchema } from './common.js';

export const categoryBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  parentId: uuidSchema.nullable().optional(),
  isPromo: z.boolean().default(false),
  promoBadgeText: z.string().trim().max(60).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const createCategorySchema = categoryBaseSchema;
export const updateCategorySchema = categoryBaseSchema.partial();

/** Mover una categoria dentro del arbol (reparent + reordenar). */
export const moveCategorySchema = z.object({
  parentId: uuidSchema.nullable(),
  displayOrder: z.coerce.number().int().min(0),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type MoveCategoryInput = z.infer<typeof moveCategorySchema>;

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isPromo: boolean;
  promoBadgeText: string | null;
  displayOrder: number;
  productCount?: number;
  children: CategoryNode[];
}
