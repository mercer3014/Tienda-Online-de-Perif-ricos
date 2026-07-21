# Villano Gamer Store

Tienda gamer online para Santa Cruz, Bolivia. Catálogo público + panel
administrativo, **sin pasarela de pago**: el cliente arma su pedido y finaliza
por **WhatsApp** con un mensaje pre-armado.

Identidad visual: **cyberpunk futurista oscuro** (negro/grafito, acentos púrpura
y verde neón, bordes biselados, resplandores neón). Mobile-first.

## Stack

| Capa           | Tecnología                                                        |
| -------------- | ----------------------------------------------------------------- |
| Monorepo       | pnpm workspaces                                                   |
| Frontend       | React + Vite + TypeScript + Tailwind CSS                          |
| Estado carrito | Zustand (persist en localStorage)                                |
| Data fetching  | TanStack Query                                                    |
| Validación     | Zod (esquemas compartidos front/back en `packages/shared-types`) |
| Backend        | Node.js + Express + TypeScript                                   |
| ORM / DB       | Prisma + PostgreSQL                                              |
| Auth admin     | JWT + bcrypt + permisos por rol                                 |
| Imágenes       | Sharp (conversión automática a WebP)                            |

> **Gestor de dependencias: pnpm (obligatorio).** Se eligió pnpm por su manejo
> eficiente de workspaces (store global con enlaces duros → instalación rápida y
> menor uso de disco) y su resolución estricta de dependencias, ideal para un
> monorepo con tres apps y un paquete compartido.

## Estructura

```
villano-gamer-store/
├── apps/
│   ├── web/            → catálogo público (cliente, sin login)
│   ├── admin/          → panel administrativo (login + roles)
│   └── api/            → backend Express + Prisma
├── packages/
│   └── shared-types/   → tipos TS + esquemas Zod compartidos
├── docker-compose.yml  → Postgres local para desarrollo
├── .env.example
└── README.md
```

## Puesta en marcha

```bash
# 1. Instalar dependencias (desde la raíz)
pnpm install

# 2. Variables de entorno
cp .env.example .env        # y completar valores reales

# 3. Base de datos
#    Opción A: Postgres local (pgAdmin) — usar el DATABASE_URL del .env
#    Opción B: docker compose up -d      → levanta Postgres en :5432

# 4. Prisma: generar cliente, migrar y sembrar datos
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Desarrollo (web + admin + api en paralelo)
pnpm dev
```

- Catálogo:  http://localhost:5173
- Admin:     http://localhost:5174
- API:       http://localhost:4000/api

### Usuarios de ejemplo (seed)

| Rol                    | Email                       | Password        |
| ---------------------- | --------------------------- | --------------- |
| Super Admin            | superadmin@villano.bo       | Villano#2025    |
| Administrador de Tienda| admin@villano.bo            | Villano#2025    |
| Encargado de Stock     | stock@villano.bo            | Villano#2025    |
| Personal de Marketing  | marketing@villano.bo        | Villano#2025    |

## Seguridad

- Credenciales sólo en `.env` (en `.gitignore` desde el primer commit).
- Contraseñas con bcrypt; rutas admin protegidas con JWT + verificación de
  permiso por rol **en cada endpoint** (no sólo en el frontend).
- Helmet, CORS restringido, rate limiting en endpoints públicos, validación Zod
  en front y back, Prisma (previene inyección SQL).
