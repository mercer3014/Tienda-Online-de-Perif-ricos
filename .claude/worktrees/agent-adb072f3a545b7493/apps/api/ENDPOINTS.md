# API — Villano Gamer Store

Base URL: `http://localhost:4000/api`
Formato de error uniforme: `{ "error": { "code", "message", "details?" } }`
Formato de éxito: `{ "data": ... }`

## Públicos (sin autenticación)

| Método | Ruta                          | Descripción                                              |
| ------ | ----------------------------- | -------------------------------------------------------- |
| GET    | `/health`                     | Healthcheck                                              |
| GET    | `/categories/tree`            | Árbol de categorías activas (con conteo de productos)    |
| GET    | `/attributes`                 | Atributos y valores (para filtros)                       |
| GET    | `/products`                   | Listado con filtros (categoría, atributos, precio, búsqueda) + paginación |
| GET    | `/products/:slug`             | Detalle de producto (variantes, imágenes, atributos)     |
| POST   | `/orders`                     | Crear orden (recalcula precios, valida stock) → devuelve texto/URL de WhatsApp. _Rate-limited_ |
| POST   | `/orders/:id/whatsapp-sent`   | Marcar `whatsapp_sent`. _Rate-limited_                   |
| POST   | `/events`                     | Registrar evento (view/add_to_cart/whatsapp_click). _Rate-limited_ |
| GET    | `/store/status`               | Estado abierta/cerrada (hora de Bolivia) + ubicación     |
| POST   | `/auth/login`                 | Login → JWT. _Rate-limited (10/15min)_                   |

## Protegidos (JWT). Cada uno exige un permiso verificado en el backend

| Método | Ruta                             | Permiso requerido        |
| ------ | -------------------------------- | ------------------------ |
| GET    | `/auth/me`                       | (solo JWT válido)        |
| GET    | `/admin/products`                | `ver_dashboard`          |
| GET    | `/admin/products/:id`            | `ver_dashboard`          |
| POST   | `/admin/products`                | `crear_producto`         |
| PATCH  | `/admin/products/:id`            | `editar_producto`        |
| DELETE | `/admin/products/:id`            | `eliminar_producto` (borrado lógico) |
| POST   | `/admin/products/:id/variants`   | `editar_producto`        |
| PATCH  | `/admin/variants/:id`            | `editar_producto`        |
| PATCH  | `/admin/variants/:id/quick`      | `editar_stock`           |
| DELETE | `/admin/variants/:id`            | `editar_producto`        |
| POST   | `/admin/products/:id/images`     | `gestionar_imagenes` (Sharp→WebP) |
| PATCH  | `/admin/images/:id/primary`      | `gestionar_imagenes`     |
| DELETE | `/admin/images/:id`              | `gestionar_imagenes`     |
| GET    | `/admin/categories/tree`         | `ver_dashboard`          |
| POST   | `/admin/categories`              | `crear_categoria`        |
| PATCH  | `/admin/categories/:id`          | `editar_categoria`       |
| PATCH  | `/admin/categories/:id/move`     | `modificar_categoria`    |
| DELETE | `/admin/categories/:id`          | `eliminar_categoria` (borrado lógico) |
| GET    | `/admin/orders`                  | `ver_pedidos`            |
| GET    | `/admin/orders/:id`              | `ver_pedidos`            |
| PATCH  | `/admin/orders/:id/status`       | `cambiar_estado_pedido`  |
| GET    | `/admin/permissions`             | `gestionar_roles`        |
| GET    | `/admin/roles`                   | `gestionar_roles`        |
| PUT    | `/admin/roles/:id/permissions`   | `gestionar_roles`        |
| GET    | `/admin/users`                   | `gestionar_usuarios`     |
| POST   | `/admin/users`                   | `gestionar_usuarios`     |
| PATCH  | `/admin/users/:id`               | `gestionar_usuarios`     |
| DELETE | `/admin/users/:id`               | `gestionar_usuarios` (baja lógica) |
| GET    | `/admin/attributes`              | `ver_dashboard`          |
| GET    | `/admin/metrics/summary`         | `ver_metricas`           |
| GET    | `/admin/audit`                   | `ver_auditoria`          |

## Auditoría automática

Escriben en `audit_log` (usuario + acción + valor antes/después): crear/editar/eliminar
producto, editar precio, editar stock, crear/mover/eliminar categoría, cambiar estado de
pedido, cambiar permisos de rol, gestionar usuarios e imágenes.

## Seguridad aplicada

- **helmet** (headers), **CORS** restringido a orígenes de web/admin.
- **Rate limiting**: login (10/15min) y endpoints públicos de escritura (100/15min).
- **bcrypt** para contraseñas; **JWT** con verificación de permiso por rol en cada endpoint.
- **Zod** valida todo input; **Prisma** previene inyección SQL.
- Manejo central de errores: nunca expone stack/queries; nunca devuelve `password_hash`.
