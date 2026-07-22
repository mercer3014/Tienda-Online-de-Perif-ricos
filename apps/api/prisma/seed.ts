/* eslint-disable no-console */
import { PrismaClient, ProductStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const DEFAULT_PASSWORD = 'Villano#2025';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_IMAGES = path.resolve(__dirname, '../uploads/seed/catalogo_imagenes');
const OUT_IMAGES = path.resolve(__dirname, '../uploads/seed/products');
const MANIFEST = path.join(SRC_IMAGES, 'catalogo_manifest.csv');

// -------------------------- Roles / permisos / usuarios -------------------
const PERMISSIONS: { key: string; description: string }[] = [
  { key: 'ver_dashboard', description: 'Ver el panel principal y resumen' },
  { key: 'crear_producto', description: 'Crear productos nuevos' },
  { key: 'editar_producto', description: 'Editar datos de productos' },
  { key: 'eliminar_producto', description: 'Desactivar (borrado logico) productos' },
  { key: 'editar_precio', description: 'Modificar el precio de variantes' },
  { key: 'editar_stock', description: 'Modificar el stock de variantes' },
  { key: 'gestionar_imagenes', description: 'Subir/eliminar imagenes de productos' },
  { key: 'crear_categoria', description: 'Crear categorias y subcategorias' },
  { key: 'editar_categoria', description: 'Editar/renombrar categorias' },
  { key: 'modificar_categoria', description: 'Mover categorias en el arbol' },
  { key: 'eliminar_categoria', description: 'Desactivar categorias' },
  { key: 'ver_pedidos', description: 'Ver pedidos generados' },
  { key: 'cambiar_estado_pedido', description: 'Cambiar el estado de un pedido' },
  { key: 'ver_metricas', description: 'Ver metricas y reportes' },
  { key: 'ver_auditoria', description: 'Ver la bitacora de auditoria' },
  { key: 'gestionar_usuarios', description: 'Alta/baja de usuarios del panel' },
  { key: 'gestionar_roles', description: 'Configurar la matriz de permisos por rol' },
];
const ALL_KEYS = PERMISSIONS.map((p) => p.key);
const ROLE_MATRIX: Record<string, string[]> = {
  'Super Admin': ALL_KEYS,
  'Administrador de Tienda': [
    'ver_dashboard', 'crear_producto', 'editar_producto', 'eliminar_producto', 'editar_precio',
    'editar_stock', 'gestionar_imagenes', 'crear_categoria', 'editar_categoria', 'modificar_categoria',
    'eliminar_categoria', 'ver_pedidos', 'cambiar_estado_pedido', 'ver_metricas', 'ver_auditoria',
  ],
  'Encargado de Stock': [
    'ver_dashboard', 'crear_producto', 'editar_producto', 'editar_precio', 'editar_stock',
    'gestionar_imagenes', 'ver_pedidos', 'ver_metricas',
  ],
  'Personal de Marketing': [
    'ver_dashboard', 'crear_categoria', 'editar_categoria', 'modificar_categoria', 'ver_pedidos', 'ver_metricas',
  ],
};
const USERS = [
  { name: 'Super Admin', email: 'superadmin@villano.bo', role: 'Super Admin' },
  { name: 'Ana Villano', email: 'admin@villano.bo', role: 'Administrador de Tienda' },
  { name: 'Marco Stock', email: 'stock@villano.bo', role: 'Encargado de Stock' },
  { name: 'Luz Marketing', email: 'marketing@villano.bo', role: 'Personal de Marketing' },
];

// -------------------------- Catalogo real (CSV) ---------------------------
// Cada categoria del CSV -> categoria padre del arbol.
const PARENT_OF: Record<string, string> = {
  'Teclados Mecanicos': 'Teclados',
  'Teclados Magneticos': 'Teclados',
  'Mouse Gamer': 'Perifericos',
  Audifonos: 'Audio',
  Auriculares: 'Audio',
  Microfonos: 'Audio',
  'Mando GameSir': 'Accesorios',
  Cargador: 'Accesorios',
  'Glass Pad': 'Accesorios',
  'Brazo para Monitor': 'Accesorios',
  'Cable Enrollado': 'Accesorios',
  Switches: 'Accesorios',
  Cooler: 'Componentes',
  Ventiladores: 'Componentes',
  'Combo Ventiladores': 'Componentes',
  Gabinetes: 'Componentes',
};
const PARENT_ORDER = ['Teclados', 'Perifericos', 'Audio', 'Componentes', 'Accesorios'];

// Distribucion de stock deterministica (cubre agotado / pocas / en stock).
const STOCKS = [12, 8, 20, 5, 15, 3, 10, 18, 0, 7, 14, 4, 9, 25, 2, 11];

interface Row {
  categoria: string;
  subcategoria: string;
  producto: string;
  marca: string;
  antes: string;
  ahora: string;
  imagenes: string[];
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows: Row[] = [];
  for (const line of lines.slice(1)) {
    const parts = line.split(',');
    if (parts.length < 8) continue;
    // Las columnas 0..6 son simples; el resto (por si hubiera comas) se reune como imagenes.
    const [, categoria, subcategoria, producto, marca, antes, ahora] = parts;
    const imagenes = parts.slice(7).join(',').split(';').map((s) => s.trim()).filter(Boolean);
    rows.push({ categoria, subcategoria, producto, marca, antes, ahora, imagenes });
  }
  return rows;
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 150) || 'item';
}

async function main() {
  console.log('Seed: limpiando datos previos...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productEvent.deleteMany();
  await prisma.variantAttributeValue.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.attributeValue.deleteMany();
  await prisma.attribute.deleteMany();
  await prisma.category.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.businessHour.deleteMany();
  await prisma.storeLocation.deleteMany();

  // ---- Roles / usuarios ----
  console.log('Seed: roles, permisos y usuarios...');
  const permissions = await Promise.all(PERMISSIONS.map((p) => prisma.permission.create({ data: p })));
  for (const [roleName, allowed] of Object.entries(ROLE_MATRIX)) {
    const role = await prisma.role.create({ data: { name: roleName } });
    await prisma.rolePermission.createMany({
      data: permissions.map((perm) => ({ roleId: role.id, permissionId: perm.id, allowed: allowed.includes(perm.key) })),
    });
  }
  const roleByName = new Map((await prisma.role.findMany()).map((r) => [r.name, r]));
  for (const u of USERS) {
    await prisma.user.create({
      data: { name: u.name, email: u.email, passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS), roleId: roleByName.get(u.role)!.id, active: true },
    });
  }

  // ---- Atributo Conectividad (para filtros del catalogo) ----
  console.log('Seed: atributos...');
  const attrConn = await prisma.attribute.create({ data: { name: 'Conectividad' } });
  const connVals: Record<string, string> = {};
  for (const v of ['Inalambrico', 'Cableado', 'Bluetooth']) {
    connVals[v] = (await prisma.attributeValue.create({ data: { attributeId: attrConn.id, value: v } })).id;
  }

  if (!existsSync(MANIFEST)) {
    console.warn(`Seed: no se encontro el manifiesto (${MANIFEST}). Se omiten productos.`);
  } else {
    const rows = parseCsv(await readFile(MANIFEST, 'utf8'));
    console.log(`Seed: ${rows.length} productos del catalogo real...`);

    // ---- Categorias (padres + subcategorias del CSV) ----
    const parentRec: Record<string, { id: string }> = {};
    let po = 1;
    for (const name of PARENT_ORDER) {
      parentRec[name] = await prisma.category.create({ data: { name, slug: slugify(name), displayOrder: po++ } });
    }
    const subRec: Record<string, { id: string }> = {};
    const subOrder: Record<string, number> = {};
    for (const r of rows) {
      if (subRec[r.categoria]) continue;
      const parent = PARENT_OF[r.categoria] ?? 'Accesorios';
      subOrder[parent] = (subOrder[parent] ?? 0) + 1;
      subRec[r.categoria] = await prisma.category.create({
        data: { name: r.categoria, slug: slugify(r.categoria), parentId: parentRec[parent].id, displayOrder: subOrder[parent] },
      });
    }

    // ---- Imagenes: preparar carpeta de salida ----
    await rm(OUT_IMAGES, { recursive: true, force: true });
    await mkdir(OUT_IMAGES, { recursive: true });

    // ---- Productos ----
    const createdProductIds: string[] = [];
    let idx = 0;
    for (const r of rows) {
      const ahora = Number(r.ahora);
      const antesNum = r.antes ? Number(r.antes) : NaN;
      const originalPrice = Number.isFinite(antesNum) && antesNum > ahora ? antesNum : null;
      const brand = r.marca && r.marca !== '-' ? r.marca : null;
      const conn = r.subcategoria === 'Inalambricos' ? 'Inalambrico' : r.subcategoria === 'Cableados' ? 'Cableado' : null;

      const product = await prisma.product.create({
        data: {
          categoryId: subRec[r.categoria].id,
          name: r.producto,
          slug: `${slugify(r.producto)}-${idx}`,
          description: `${r.producto}${brand ? ` — ${brand}` : ''}. Disponible en Villano Gamer Store, Santa Cruz de la Sierra.${originalPrice ? ' ¡En promoción!' : ''}`,
          brand,
          basePrice: ahora,
          originalPrice,
          status: ProductStatus.activo,
        },
      });
      createdProductIds.push(product.id);

      // Imagenes (convertidas a WebP).
      let imgOrder = 0;
      for (const rel of r.imagenes.slice(0, 4)) {
        const abs = path.join(SRC_IMAGES, rel);
        if (!existsSync(abs)) continue;
        const outName = `${slugify(r.producto)}-${idx}-${imgOrder}.webp`;
        const buf = await sharp(abs).resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        await writeFile(path.join(OUT_IMAGES, outName), buf);
        await prisma.productImage.create({
          data: { productId: product.id, urlWebp: `/uploads/seed/products/${outName}`, displayOrder: imgOrder, isPrimary: imgOrder === 0 },
        });
        imgOrder++;
      }

      // Variante unica (precio actual). Atributo Conectividad si aplica.
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `${slugify(r.producto).toUpperCase().replace(/-/g, '').slice(0, 18)}-${idx}`,
          price: ahora,
          stockQuantity: STOCKS[idx % STOCKS.length],
        },
      });
      if (conn) {
        await prisma.variantAttributeValue.create({ data: { variantId: variant.id, attributeValueId: connVals[conn] } });
      }
      idx++;
    }
    console.log(`Seed: ${createdProductIds.length} productos creados con datos e imagenes reales.`);

    // ---- Eventos de metricas ----
    console.log('Seed: eventos de metricas...');
    const eventData: { productId: string; eventType: 'view' | 'add_to_cart' | 'whatsapp_click'; sessionId: string }[] = [];
    createdProductIds.forEach((id, i) => {
      const views = Math.max(2, 40 - i);
      for (let v = 0; v < views; v++) eventData.push({ productId: id, eventType: 'view', sessionId: `s-${i}-${v}` });
      for (let a = 0; a < Math.max(1, 15 - i); a++) eventData.push({ productId: id, eventType: 'add_to_cart', sessionId: `s-${i}-${a}` });
      for (let w = 0; w < Math.max(0, 7 - i); w++) eventData.push({ productId: id, eventType: 'whatsapp_click', sessionId: `s-${i}-${w}` });
    });
    await prisma.productEvent.createMany({ data: eventData });
  }

  // ---- Tienda ----
  console.log('Seed: horario y ubicacion...');
  await prisma.businessHour.createMany({
    data: [
      { dayOfWeek: 0, openTime: '00:00', closeTime: '00:00', isClosed: true },
      { dayOfWeek: 1, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 2, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 3, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 4, openTime: '09:00', closeTime: '20:00', isClosed: false },
      { dayOfWeek: 5, openTime: '09:00', closeTime: '21:00', isClosed: false },
      { dayOfWeek: 6, openTime: '10:00', closeTime: '21:00', isClosed: false },
    ],
  });
  await prisma.storeLocation.create({
    data: {
      mallName: 'Ventura Mall', address: 'Av. San Martin, Equipetrol, Santa Cruz de la Sierra',
      passageNumber: 'Pasaje 3', localeNumber: 'Local 214', latitude: -17.7592, longitude: -63.1975,
      googleMapsUrl: 'https://maps.google.com/?q=-17.7592,-63.1975',
      wazeUrl: 'https://waze.com/ul?ll=-17.7592,-63.1975&navigate=yes',
    },
  });

  console.log('Seed: completado OK.');
}

main()
  .catch((e) => { console.error('Seed fallo:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
