import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Carga el .env de la raiz del monorepo (fuente unica de credenciales).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  API_PORT: z.coerce.number().int().default(4000),
  // Render (y la mayoria de PaaS) asignan el puerto dinamicamente via PORT;
  // API_PORT sigue siendo el default para desarrollo local.
  PORT: z.coerce.number().int().optional(),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(8),

  // Si estan presentes, las imagenes se guardan en Supabase Storage en vez
  // del disco local (el disco de Render no es persistente entre deploys).
  // En local dev se dejan vacios y se usa el disco, como siempre.
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('product-images'),

  // Solo digitos, formato internacional sin "+" (8-15 digitos). Un numero mal
  // configurado rompe en silencio el unico paso de conversion del negocio:
  // el link wa.me que se genera en cada pedido.
  STORE_WHATSAPP_NUMBER: z
    .string()
    .regex(/^\d{8,15}$/, 'STORE_WHATSAPP_NUMBER debe tener solo digitos en formato internacional (8-15 digitos)')
    .default('59170000000'),
  STORE_TIMEZONE: z.string().default('America/La_Paz'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Error de configuracion (.env):', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  corsOrigins: raw.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  uploadDirAbs: path.resolve(__dirname, '../..', raw.UPLOAD_DIR),
  maxUploadBytes: raw.MAX_UPLOAD_MB * 1024 * 1024,
  // Efectivo: PORT (Render/Heroku/etc lo inyectan) tiene prioridad sobre API_PORT.
  effectivePort: raw.PORT ?? raw.API_PORT,
};
