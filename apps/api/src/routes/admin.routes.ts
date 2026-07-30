import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  createAttributeSchema,
  createAttributeValueSchema,
  createCategorySchema,
  createProductSchema,
  createUserSchema,
  createVariantSchema,
  DELIVERY_METHOD_LABEL,
  moveCategorySchema,
  OrderStatus,
  quickUpdateVariantSchema,
  updateCategorySchema,
  updateOrderStatusSchema,
  updateProductSchema,
  updateRolePermissionsSchema,
  updateUserSchema,
  updateVariantSchema,
  uuidSchema,
} from '@villano/shared-types';
import { asyncHandler, ok } from '../lib/http.js';
import { badRequest, forbidden } from '../lib/errors.js';
import { validate, getQuery } from '../middleware/validate.js';
import { requireAuth, requirePermission, getAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

import { adminListProducts, createProduct, softDeleteProduct, updateProduct } from '../modules/products/product.admin.service.js';
import { getProductById } from '../modules/products/product.service.js';
import { createVariant, deleteVariant, quickUpdateVariant, updateVariant } from '../modules/variants/variant.service.js';
import { deleteImage, processAndStoreImage, setPrimaryImage } from '../modules/images/image.service.js';
import { getCategoryTree, createCategory, updateCategory, moveCategory, softDeleteCategory } from '../modules/categories/category.service.js';
import { changeOrderStatus, getOrder, listOrders, listOrdersForExport } from '../modules/orders/order.service.js';
import { listRolesWithMatrix, listPermissions, updateRolePermissions } from '../modules/roles/role.service.js';
import { createUser, deactivateUser, listUsers, updateUser } from '../modules/users/user.service.js';
import { getMetricsSummary } from '../modules/metrics/metrics.service.js';
import { listAudit, listAuditForExport } from '../modules/audit/audit.service.js';
import {
  createAttribute,
  createAttributeValue,
  deleteAttribute,
  deleteAttributeValue,
  listAttributes,
} from '../modules/attributes/attribute.service.js';
import { toCsv } from '../lib/csv.js';

const idParam = z.object({ id: uuidSchema });

/**
 * La edicion rapida de variante acepta precio Y stock en el mismo body, pero
 * son permisos distintos (editar_precio / editar_stock). requirePermission
 * a nivel de ruta solo puede exigir uno; este middleware exige editar_precio
 * ADEMAS cuando el body trae un cambio de precio, para que un rol pensado
 * solo para "editar stock" no pueda tocar precios via este endpoint.
 */
function requirePriceEditIfChanged(req: Request, _res: Response, next: NextFunction) {
  if (req.body?.price !== undefined && !getAuth(req).permissions.has('editar_precio')) {
    return next(forbidden('Requiere el permiso: editar_precio'));
  }
  next();
}

const listQuery = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // El admin puede traer el catalogo completo (tienda fisica) para filtrar/ordenar en cliente.
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo se permiten imagenes'));
    cb(null, true);
  },
});

export const adminRouter: RouterType = Router();

// Todo el router admin exige JWT valido.
adminRouter.use(requireAuth);

// -------------------------------- Productos --------------------------------
adminRouter.get(
  '/products',
  requirePermission('ver_dashboard'),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = getQuery<z.infer<typeof listQuery>>(req);
    const { items, total } = await adminListProducts(q);
    ok(res, { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) });
  }),
);

adminRouter.get(
  '/products/:id',
  requirePermission('ver_dashboard'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => ok(res, await getProductById(req.params.id))),
);

adminRouter.post(
  '/products',
  requirePermission('crear_producto'),
  validate({ body: createProductSchema }),
  asyncHandler(async (req, res) => ok(res, await createProduct(req.body, getAuth(req).userId), 201)),
);

adminRouter.patch(
  '/products/:id',
  requirePermission('editar_producto'),
  validate({ params: idParam, body: updateProductSchema }),
  asyncHandler(async (req, res) => ok(res, await updateProduct(req.params.id, req.body, getAuth(req).userId))),
);

adminRouter.delete(
  '/products/:id',
  requirePermission('eliminar_producto'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => ok(res, await softDeleteProduct(req.params.id, getAuth(req).userId))),
);

// -------------------------------- Variantes --------------------------------
adminRouter.post(
  '/products/:id/variants',
  requirePermission('editar_producto'),
  validate({ params: idParam, body: createVariantSchema }),
  asyncHandler(async (req, res) => ok(res, await createVariant(req.params.id, req.body, getAuth(req).userId), 201)),
);

adminRouter.patch(
  '/variants/:id',
  requirePermission('editar_producto'),
  validate({ params: idParam, body: updateVariantSchema }),
  asyncHandler(async (req, res) => ok(res, await updateVariant(req.params.id, req.body, getAuth(req).userId))),
);

// Edicion rapida de precio/stock (permiso mas granular).
adminRouter.patch(
  '/variants/:id/quick',
  requirePermission('editar_stock'),
  validate({ params: idParam, body: quickUpdateVariantSchema }),
  requirePriceEditIfChanged,
  asyncHandler(async (req, res) => ok(res, await quickUpdateVariant(req.params.id, req.body, getAuth(req).userId))),
);

adminRouter.delete(
  '/variants/:id',
  requirePermission('editar_producto'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => ok(res, await deleteVariant(req.params.id, getAuth(req).userId))),
);

// --------------------------------- Imagenes --------------------------------
adminRouter.post(
  '/products/:id/images',
  requirePermission('gestionar_imagenes'),
  validate({ params: idParam }),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No se recibio ninguna imagen (campo "image")');
    ok(res, await processAndStoreImage(req.params.id, req.file, getAuth(req).userId), 201);
  }),
);

adminRouter.patch(
  '/images/:id/primary',
  requirePermission('gestionar_imagenes'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => ok(res, await setPrimaryImage(req.params.id, getAuth(req).userId))),
);

adminRouter.delete(
  '/images/:id',
  requirePermission('gestionar_imagenes'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => ok(res, await deleteImage(req.params.id, getAuth(req).userId))),
);

// -------------------------------- Categorias -------------------------------
adminRouter.get(
  '/categories/tree',
  requirePermission('ver_dashboard'),
  asyncHandler(async (_req, res) => ok(res, await getCategoryTree({ includeInactive: true }))),
);

adminRouter.post(
  '/categories',
  requirePermission('crear_categoria'),
  validate({ body: createCategorySchema }),
  asyncHandler(async (req, res) => ok(res, await createCategory(req.body, getAuth(req).userId), 201)),
);

adminRouter.patch(
  '/categories/:id',
  requirePermission('editar_categoria'),
  validate({ params: idParam, body: updateCategorySchema }),
  asyncHandler(async (req, res) => ok(res, await updateCategory(req.params.id, req.body, getAuth(req).userId))),
);

adminRouter.patch(
  '/categories/:id/move',
  requirePermission('modificar_categoria'),
  validate({ params: idParam, body: moveCategorySchema }),
  asyncHandler(async (req, res) => ok(res, await moveCategory(req.params.id, req.body, getAuth(req).userId))),
);

adminRouter.delete(
  '/categories/:id',
  requirePermission('eliminar_categoria'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => ok(res, await softDeleteCategory(req.params.id, getAuth(req).userId))),
);

// ---------------------------------- Pedidos --------------------------------
const orderListQuery = listQuery.extend({ status: OrderStatus.optional() });
adminRouter.get(
  '/orders',
  requirePermission('ver_pedidos'),
  validate({ query: orderListQuery }),
  asyncHandler(async (req, res) => {
    const q = getQuery<z.infer<typeof orderListQuery>>(req);
    const { items, total } = await listOrders(q);
    ok(res, { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) });
  }),
);

const exportOrdersQuery = z.object({
  status: OrderStatus.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
adminRouter.get(
  '/orders/export',
  requirePermission('ver_pedidos'),
  validate({ query: exportOrdersQuery }),
  asyncHandler(async (req, res) => {
    const q = getQuery<z.infer<typeof exportOrdersQuery>>(req);
    const rows = await listOrdersForExport(q);
    const csv = toCsv(
      rows.map((o) => ({
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        status: o.status,
        customerName: o.customerName ?? '',
        customerPhone: o.customerPhone ?? '',
        deliveryMethod: DELIVERY_METHOD_LABEL[o.deliveryMethod],
        totalAmount: o.totalAmount,
        itemCount: o.itemCount,
      })),
      [
        { key: 'orderNumber', header: 'Numero de pedido' },
        { key: 'createdAt', header: 'Fecha' },
        { key: 'status', header: 'Estado' },
        { key: 'customerName', header: 'Nombre' },
        { key: 'customerPhone', header: 'Telefono' },
        { key: 'deliveryMethod', header: 'Entrega' },
        { key: 'totalAmount', header: 'Total' },
        { key: 'itemCount', header: 'Cantidad de items' },
      ],
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pedidos.csv"');
    res.send(csv);
  }),
);

adminRouter.get(
  '/orders/:id',
  requirePermission('ver_pedidos'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => ok(res, await getOrder(req.params.id))),
);

adminRouter.patch(
  '/orders/:id/status',
  requirePermission('cambiar_estado_pedido'),
  validate({ params: idParam, body: updateOrderStatusSchema }),
  asyncHandler(async (req, res) => ok(res, await changeOrderStatus(req.params.id, req.body, getAuth(req).userId))),
);

// ------------------------------ Roles y permisos ---------------------------
adminRouter.get(
  '/permissions',
  requirePermission('gestionar_roles'),
  asyncHandler(async (_req, res) => ok(res, await listPermissions())),
);

adminRouter.get(
  '/roles',
  requirePermission('gestionar_roles'),
  asyncHandler(async (_req, res) => ok(res, await listRolesWithMatrix())),
);

adminRouter.put(
  '/roles/:id/permissions',
  requirePermission('gestionar_roles'),
  validate({ params: idParam, body: updateRolePermissionsSchema }),
  asyncHandler(async (req, res) => ok(res, await updateRolePermissions(req.params.id, req.body, getAuth(req).userId))),
);

// -------------------------------- Usuarios ---------------------------------
adminRouter.get(
  '/users',
  requirePermission('gestionar_usuarios'),
  asyncHandler(async (_req, res) => ok(res, await listUsers())),
);

adminRouter.post(
  '/users',
  requirePermission('gestionar_usuarios'),
  validate({ body: createUserSchema }),
  asyncHandler(async (req, res) => ok(res, await createUser(req.body, getAuth(req).userId), 201)),
);

adminRouter.patch(
  '/users/:id',
  requirePermission('gestionar_usuarios'),
  validate({ params: idParam, body: updateUserSchema }),
  asyncHandler(async (req, res) => ok(res, await updateUser(req.params.id, req.body, getAuth(req).userId))),
);

adminRouter.delete(
  '/users/:id',
  requirePermission('gestionar_usuarios'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => ok(res, await deactivateUser(req.params.id, getAuth(req).userId))),
);

// --------------------------- Atributos (para forms) ------------------------
adminRouter.get(
  '/attributes',
  requirePermission('ver_dashboard'),
  asyncHandler(async (_req, res) => ok(res, await listAttributes())),
);

adminRouter.post(
  '/attributes',
  requirePermission('crear_producto'),
  validate({ body: createAttributeSchema }),
  asyncHandler(async (req, res) => ok(res, await createAttribute(req.body, getAuth(req).userId), 201)),
);

adminRouter.delete(
  '/attributes/:id',
  requirePermission('crear_producto'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await deleteAttribute(req.params.id, getAuth(req).userId);
    ok(res, { success: true });
  }),
);

adminRouter.post(
  '/attributes/:id/values',
  requirePermission('crear_producto'),
  validate({ params: idParam, body: createAttributeValueSchema }),
  asyncHandler(async (req, res) => ok(res, await createAttributeValue(req.params.id, req.body, getAuth(req).userId), 201)),
);

adminRouter.delete(
  '/attribute-values/:id',
  requirePermission('crear_producto'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await deleteAttributeValue(req.params.id, getAuth(req).userId);
    ok(res, { success: true });
  }),
);

// --------------------------------- Metricas --------------------------------
adminRouter.get(
  '/metrics/summary',
  requirePermission('ver_metricas'),
  asyncHandler(async (_req, res) => ok(res, await getMetricsSummary())),
);

// -------------------------------- Auditoria --------------------------------
const auditQuery = listQuery.extend({
  userId: uuidSchema.optional(),
  entityType: z.string().max(60).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
adminRouter.get(
  '/audit',
  requirePermission('ver_auditoria'),
  validate({ query: auditQuery }),
  asyncHandler(async (req, res) => {
    const q = getQuery<z.infer<typeof auditQuery>>(req);
    const { items, total } = await listAudit(q);
    ok(res, { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) });
  }),
);

const exportAuditQuery = z.object({
  userId: uuidSchema.optional(),
  entityType: z.string().max(60).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
adminRouter.get(
  '/audit/export',
  requirePermission('ver_auditoria'),
  validate({ query: exportAuditQuery }),
  asyncHandler(async (req, res) => {
    const q = getQuery<z.infer<typeof exportAuditQuery>>(req);
    const rows = await listAuditForExport(q);
    const csv = toCsv(
      rows.map((r) => ({
        createdAt: r.createdAt,
        user: r.user ? `${r.user.name} <${r.user.email}>` : 'Sistema',
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId ?? '',
      })),
      [
        { key: 'createdAt', header: 'Fecha' },
        { key: 'user', header: 'Usuario' },
        { key: 'action', header: 'Accion' },
        { key: 'entityType', header: 'Tipo de entidad' },
        { key: 'entityId', header: 'Id de entidad' },
      ],
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="auditoria.csv"');
    res.send(csv);
  }),
);
