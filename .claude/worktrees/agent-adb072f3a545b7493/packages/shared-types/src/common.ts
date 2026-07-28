import { z } from 'zod';

/** Slug URL-safe reutilizable. */
export const slugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug invalido (solo minusculas, numeros y guiones)');

export const uuidSchema = z.string().uuid('Identificador invalido');

/** Parametros de paginacion para listados. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Formato unico de respuesta de error de la API. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Helper de tipado para respuestas exitosas. */
export interface ApiOk<T> {
  data: T;
}
