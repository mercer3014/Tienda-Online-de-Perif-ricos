import { prisma } from './prisma.js';

const REQUIRED_PERMISSIONS = [
  { key: 'ver_dashboard', description: 'Ver el panel principal y resumen' },
  { key: 'crear_producto', description: 'Crear productos nuevos' },
  { key: 'editar_producto', description: 'Editar datos de productos' },
  { key: 'eliminar_producto', description: 'Desactivar (borrado lógico) productos' },
  { key: 'editar_precio', description: 'Modificar el precio de variantes' },
  { key: 'editar_stock', description: 'Modificar el stock de variantes' },
  { key: 'gestionar_imagenes', description: 'Subir/eliminar imágenes de productos' },
  { key: 'crear_categoria', description: 'Crear categorías y subcategorías' },
  { key: 'editar_categoria', description: 'Editar/renombrar categorías' },
  { key: 'modificar_categoria', description: 'Mover categorías en el árbol' },
  { key: 'eliminar_categoria', description: 'Desactivar categorías' },
  { key: 'ver_pedidos', description: 'Ver pedidos generados' },
  { key: 'cambiar_estado_pedido', description: 'Cambiar el estado de un pedido' },
  { key: 'ver_metricas', description: 'Ver métricas y reportes' },
  { key: 'ver_auditoria', description: 'Ver la bitácora de auditoría' },
  { key: 'gestionar_usuarios', description: 'Alta/baja de usuarios del panel' },
  { key: 'gestionar_roles', description: 'Configurar la matriz de permisos por rol' },
  { key: 'gestionar_configuracion', description: 'Configurar datos generales de la tienda (número de WhatsApp, etc.)' },
];

export async function ensurePermissionsExist() {
  try {
    for (const perm of REQUIRED_PERMISSIONS) {
      let permissionRecord = await prisma.permission.findUnique({ where: { key: perm.key } });
      if (!permissionRecord) {
        permissionRecord = await prisma.permission.create({ data: perm });
      }

      // Asegurar que Super Admin y Administrador de Tienda tengan el permiso por defecto
      const roles = await prisma.role.findMany({
        where: { name: { in: ['Super Admin', 'Administrador de Tienda'] } },
      });

      for (const role of roles) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permissionRecord.id } },
          create: { roleId: role.id, permissionId: permissionRecord.id, allowed: true },
          update: {},
        });
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[API] Warning al verificar permisos iniciales:', err);
  }
}
