import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import {
  createOrderSchema,
  listProductsQuerySchema,
  trackEventSchema,
  uuidSchema,
} from '@villano/shared-types';
import { asyncHandler, ok } from '../lib/http.js';
import { validate, getQuery } from '../middleware/validate.js';
import { getCategoryTree } from '../modules/categories/category.service.js';
import { listProducts, getProductBySlug } from '../modules/products/product.service.js';
import { listAttributes } from '../modules/attributes/attribute.service.js';
import { createOrder, markWhatsappSent } from '../modules/orders/order.service.js';
import { trackEvent } from '../modules/metrics/metrics.service.js';
import { getStoreStatus } from '../modules/store/store.service.js';

export const publicRouter: RouterType = Router();

// Arbol de categorias (solo activas).
publicRouter.get(
  '/categories/tree',
  asyncHandler(async (_req, res) => ok(res, await getCategoryTree())),
);

// Atributos y valores (para filtros del catalogo).
publicRouter.get(
  '/attributes',
  asyncHandler(async (_req, res) => ok(res, await listAttributes())),
);

// Listado de productos con filtros y paginacion.
publicRouter.get(
  '/products',
  validate({ query: listProductsQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = getQuery<import('@villano/shared-types').ListProductsQuery>(req);
    const { items, total } = await listProducts(q);
    ok(res, {
      items,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.ceil(total / q.pageSize),
    });
  }),
);

// Detalle de producto por slug.
publicRouter.get(
  '/products/:slug',
  validate({ params: z.object({ slug: z.string().min(1) }) }),
  asyncHandler(async (req, res) => ok(res, await getProductBySlug(req.params.slug))),
);

// Crear orden (checkout por WhatsApp).
publicRouter.post(
  '/orders',
  validate({ body: createOrderSchema }),
  asyncHandler(async (req, res) => ok(res, await createOrder(req.body), 201)),
);

// Marcar que se abrio WhatsApp (best-effort desde el frontend).
publicRouter.post(
  '/orders/:id/whatsapp-sent',
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler(async (req, res) => ok(res, await markWhatsappSent(req.params.id))),
);

// Registro de evento de producto (metricas).
publicRouter.post(
  '/events',
  validate({ body: trackEventSchema }),
  asyncHandler(async (req, res) => ok(res, await trackEvent(req.body), 201)),
);

// Estado de la tienda (abierta/cerrada) + ubicacion.
publicRouter.get(
  '/store/status',
  asyncHandler(async (_req, res) => ok(res, await getStoreStatus())),
);
