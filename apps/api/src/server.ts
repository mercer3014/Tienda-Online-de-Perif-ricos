import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { ensurePermissionsExist } from './lib/ensurePermissions.js';

async function main() {
  // Verifica conexión a la base antes de escuchar.
  await prisma.$connect();
  await ensurePermissionsExist();
  const app = createApp();
  const server = app.listen(env.effectivePort, () => {
    // eslint-disable-next-line no-console
    console.log(`[API] Villano Gamer Store escuchando en http://localhost:${env.effectivePort}/api`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n[API] ${signal} recibido, cerrando...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('[API] Error fatal al iniciar:', err);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
