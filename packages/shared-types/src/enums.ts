import { z } from 'zod';

/** Estado del producto: borrado logico via 'inactivo' (no DELETE fisico). */
export const ProductStatus = z.enum(['activo', 'inactivo']);
export type ProductStatus = z.infer<typeof ProductStatus>;

/** Estado de stock calculado (nunca manual): derivado de stock_quantity. */
export const StockStatus = z.enum(['en_stock', 'pocas_unidades', 'agotado']);
export type StockStatus = z.infer<typeof StockStatus>;

/** Estado del pedido generado desde el carrito. */
export const OrderStatus = z.enum(['pendiente', 'coordinado', 'completado', 'cancelado']);
export type OrderStatus = z.infer<typeof OrderStatus>;

/** Como quiere recibir el pedido el cliente. */
export const DeliveryMethod = z.enum(['retiro', 'delivery']);
export type DeliveryMethod = z.infer<typeof DeliveryMethod>;

export const DELIVERY_METHOD_LABEL: Record<DeliveryMethod, string> = {
  retiro: 'Retiro en tienda',
  delivery: 'Delivery',
};

/** Tipos de evento para metricas de demanda y abandono de carrito. */
export const ProductEventType = z.enum(['view', 'add_to_cart', 'whatsapp_click']);
export type ProductEventType = z.infer<typeof ProductEventType>;

/** Roles base del personal de la tienda. */
export const RoleName = z.enum([
  'Super Admin',
  'Administrador de Tienda',
  'Encargado de Stock',
  'Personal de Marketing',
]);
export type RoleName = z.infer<typeof RoleName>;

/**
 * Claves de permiso. Cada endpoint admin exige una de estas y el backend
 * la verifica contra la matriz role_permissions (no confia en el frontend).
 */
export const PermissionKey = z.enum([
  'ver_dashboard',
  'crear_producto',
  'editar_producto',
  'eliminar_producto',
  'editar_precio',
  'editar_stock',
  'gestionar_imagenes',
  'crear_categoria',
  'editar_categoria',
  'modificar_categoria',
  'eliminar_categoria',
  'ver_pedidos',
  'cambiar_estado_pedido',
  'ver_metricas',
  'ver_auditoria',
  'gestionar_usuarios',
  'gestionar_roles',
  'gestionar_configuracion',
]);
export type PermissionKey = z.infer<typeof PermissionKey>;

/**
 * Paleta fija de iconos elegibles para una categoria desde el admin (crear o
 * editar categoria, cualquier nivel del arbol). Es una lista controlada (no
 * texto libre / URL / SVG arbitrario) para no depender de que el nombre o
 * slug "adivine" el icono correcto -asi una categoria borrada y vuelta a
 * crear, o una completamente nueva, siempre puede elegir su propio icono-.
 * Cada frontend (web/admin) mapea estas claves a su propio componente de
 * icono (lucide-react); agregar una clave nueva aca las habilita en ambos.
 */
export const CategoryIconKey = z.enum([
  'keyboard',
  'mouse',
  'headphones',
  'speaker',
  'mic',
  'webcam',
  'monitor',
  'cpu',
  'memory',
  'circuit-board',
  'hard-drive',
  'fan',
  'cable',
  'usb',
  'router',
  'gamepad',
  'joystick',
  'chair',
  'package',
  'layout-grid',
]);
export type CategoryIconKey = z.infer<typeof CategoryIconKey>;

/** Umbrales de stock (fuente unica de verdad, compartida). */
export const STOCK_THRESHOLD_LOW = 5;

/** Calcula el estado de stock a partir de la cantidad. */
export function computeStockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return 'agotado';
  if (quantity < STOCK_THRESHOLD_LOW) return 'pocas_unidades';
  return 'en_stock';
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  en_stock: 'En Stock',
  pocas_unidades: 'Pocas Unidades',
  agotado: 'Agotado',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  coordinado: 'Coordinado',
  completado: 'Completado',
  cancelado: 'Cancelado',
};
