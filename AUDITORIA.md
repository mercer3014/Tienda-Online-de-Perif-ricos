# Auditoría final — Villano Gamer Store (Fase 6)

Se hicieron **2 pasadas completas** del checklist con evidencia real (no "debería
andar"). La segunda pasada no encontró ningún problema nuevo, por lo que se da el
sistema por terminado.

## Pasada 1 — hallazgos y correcciones

| # | Área | Verificación | Resultado |
|---|------|--------------|-----------|
| A | Seguridad | `.env` no está en el repositorio (`git ls-files`) | ✅ No trackeado |
| B/C | Seguridad | Los 30 handlers admin tienen `requirePermission` (scan) | ✅ 30/30, 0 sin guard |
| D | BD | Índices en todas las FK (category_id, product_id, parent_id, order_id, variant_id, created_at) | ✅ Presentes |
| E | BD | Insertar `order_item` con variante inexistente | ✅ Rechazado por FK |
| F | Rendimiento | `EXPLAIN` de productos por categoría | ✅ Index Scan |
| G | Funcional | Filtros combinables (atributo Blue + precio) | ✅ 2 → 1 (combina) |
| H | Funcional | Borrado lógico de producto queda en audit_log | ✅ `eliminar_producto` auditado |
| I | Funcional | Abierta/Cerrada vs hora real de Bolivia | ✅ Coincide |

**Corrección aplicada:** se detectaron productos de prueba creados durante el QA
manual; se re-ejecutó el `seed` para dejar la base en estado limpio (8 productos).
No se hallaron defectos de código en esta pasada (los errores de compilación se
habían corregido durante la construcción de cada fase).

## Pasada 2 — verificación cruzada

| # | Área | Verificación | Resultado |
|---|------|--------------|-----------|
| J–M | Build | Typecheck de shared-types, api, web y admin | ✅ Los 4 limpios |
| — | Build | `pnpm build` completo del monorepo | ✅ Exit 0 |
| N | Funcional | Producto inactivo oculto del catálogo público | ✅ 0 inactivos visibles |
| O | Seguridad | Scan de `password_hash` en /products, /admin/*, /auth/me | ✅ 0 fugas |
| Q | Seguridad | Rate limiting en /auth/login | ✅ 429 tras el umbral |
| R | Seguridad | CORS permite web/admin y bloquea orígenes desconocidos | ✅ Correcto |
| S | Funcional | Selector de variantes: precio/stock/estado por variante | ✅ 12→En stock, 3→Pocas, 0→Agotado |
| T | Rendimiento | Imágenes servidas en WebP | ✅ Todas .webp |

**Resultado:** ninguna incidencia nueva. Segunda pasada limpia.

## Checklist final

### Base de datos
- [x] Esquema normalizado (≥3FN); `stock_status` es derivado (no se almacena).
- [x] Todas las FK con índice y `onDelete` coherente (Restrict catálogo, Cascade
      en hijos, SetNull para preservar histórico de pedidos/auditoría).
- [x] Imposible insertar pedido con producto/variante inexistente (FK + validación).

### Seguridad
- [x] Ningún endpoint admin accesible sin JWT válido (401).
- [x] Cada endpoint admin verifica el permiso específico en el backend (403).
- [x] Contraseñas con bcrypt.
- [x] Ninguna respuesta devuelve `password_hash`.
- [x] Validación Zod en frontend y backend.
- [x] Rate limiting en login y endpoints públicos de escritura.
- [x] `.env` sólo local, fuera del repositorio.

### Rendimiento
- [x] Imágenes WebP (Sharp) con `loading="lazy"`.
- [x] Listados paginados (productos, pedidos, auditoría).
- [x] Consultas frecuentes sobre columnas indexadas.

### Experiencia / responsive
- [x] Loaders (skeletons/spinners) en cada espera de red.
- [x] Errores manejados con mensaje claro (nunca pantalla rota).
- [x] Catálogo y admin responsive (mobile-first, sidebar colapsable).
- [x] Flujo de compra completo funciona en mobile.

### Funcional
- [x] Filtros por categoría/atributo/precio correctos y combinables.
- [x] Selector de variantes actualiza precio y stock.
- [x] Mensaje de WhatsApp con todos los datos y total correcto.
- [x] Audit log registra creación, edición y eliminación.
- [x] Indicador Abierta/Cerrada según hora real de Bolivia.
