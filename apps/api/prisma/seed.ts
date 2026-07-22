/* eslint-disable no-console */
import { PrismaClient, ProductStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { mkdir, readdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const DEFAULT_PASSWORD = 'Villano#2025';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_IMAGES = path.resolve(__dirname, '../uploads/seed/catalogo_imagenes');
const OUT_IMAGES = path.resolve(__dirname, '../uploads/seed/products');

// -------------------------------------------------------------------------
// Permisos, roles y usuarios (sin cambios).
// -------------------------------------------------------------------------
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

// -------------------------------------------------------------------------
// Mapeo de carpeta de imagenes -> categoria + atributos.
// -------------------------------------------------------------------------
type Conn = 'Cableado' | 'Inalambrico' | 'Bluetooth' | null;
interface FolderCfg {
  sub: string; // subcategoria
  conn: Conn;
  mechanical?: boolean;
  magnetic?: boolean;
  keyboard?: boolean;
  priceRange: [number, number];
}
const FOLDER_CFG: Record<string, FolderCfg> = {
  audifonos_1: { sub: 'Audifonos', conn: 'Inalambrico', priceRange: [180, 520] },
  audifonos_2_y_auriculares: { sub: 'Audifonos', conn: 'Cableado', priceRange: [150, 480] },
  cable_swiches_cooler_ventiladores: { sub: 'Coolers y Ventiladores', conn: null, priceRange: [60, 280] },
  cargador_glasspad_brazo: { sub: 'Cargadores y Soportes', conn: null, priceRange: [90, 360] },
  combo_y_gabinetes: { sub: 'Gabinetes', conn: null, priceRange: [220, 620] },
  microfonos_y_mando: { sub: 'Microfonos y Mandos', conn: 'Cableado', priceRange: [150, 450] },
  mouses_5_y_cableados_1: { sub: 'Mouse Gamer', conn: 'Cableado', priceRange: [90, 360] },
  mouses_cableados_2: { sub: 'Mouse Gamer', conn: 'Cableado', priceRange: [110, 380] },
  mouses_inalambricos_1: { sub: 'Mouse Gamer', conn: 'Inalambrico', priceRange: [160, 520] },
  mouses_inalambricos_2: { sub: 'Mouse Gamer', conn: 'Inalambrico', priceRange: [180, 560] },
  mouses_inalambricos_3: { sub: 'Mouse Gamer', conn: 'Inalambrico', priceRange: [200, 620] },
  mouses_inalambricos_4: { sub: 'Mouse Gamer', conn: 'Inalambrico', priceRange: [200, 640] },
  teclados_magneticos_inalambricos_2: { sub: 'Teclados', conn: 'Inalambrico', magnetic: true, keyboard: true, priceRange: [320, 780] },
  teclados_magneticos_inalambricos_y_cableados: { sub: 'Teclados', conn: 'Cableado', magnetic: true, keyboard: true, priceRange: [300, 760] },
  teclados_mecanicos_cableados: { sub: 'Teclados', conn: 'Cableado', mechanical: true, keyboard: true, priceRange: [260, 640] },
  teclados_mecanicos_inalambricos: { sub: 'Teclados', conn: 'Inalambrico', mechanical: true, keyboard: true, priceRange: [320, 720] },
};
// Subcategoria -> categoria padre.
const SUB_PARENT: Record<string, string> = {
  'Mouse Gamer': 'Perifericos',
  Teclados: 'Perifericos',
  Audifonos: 'Perifericos',
  'Microfonos y Mandos': 'Perifericos',
  'Coolers y Ventiladores': 'Componentes',
  Gabinetes: 'Componentes',
  'Cargadores y Soportes': 'Accesorios',
};

const BRANDS = ['attack shark', 'logitech', 'razer', 'gravastar', 'mchose', 'onikuma', 'ajazz', 'atk', 'irok', 'scyrox', 'vgn', 'vxe', 'nb', 'gabinete', 'cpu', 'attack'];

// hash deterministico simple.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function titleCase(s: string): string {
  return s.replace(/[_+=]+/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}
function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 150);
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
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

  // ----------------------------- Roles / usuarios -----------------------------
  console.log('Seed: roles, permisos y usuarios...');
  const permissions = await Promise.all(
    PERMISSIONS.map((p) => prisma.permission.create({ data: p })),
  );
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

  // ------------------------------- Atributos ---------------------------------
  console.log('Seed: atributos...');
  const attrConn = await prisma.attribute.create({ data: { name: 'Conectividad' } });
  const attrSwitch = await prisma.attribute.create({ data: { name: 'Tipo de switch' } });
  const attrFormat = await prisma.attribute.create({ data: { name: 'Formato' } });
  const mkVal = (attributeId: string, value: string) => prisma.attributeValue.create({ data: { attributeId, value } });
  const connVals: Record<string, string> = {};
  for (const v of ['Cableado', 'Inalambrico', 'Bluetooth']) connVals[v] = (await mkVal(attrConn.id, v)).id;
  const switchVals: Record<string, string> = {};
  for (const v of ['Blue', 'Red', 'Brown', 'Magnetico']) switchVals[v] = (await mkVal(attrSwitch.id, v)).id;
  const formatVals: Record<string, string> = {};
  for (const v of ['Full Size', 'TKL', '60%']) formatVals[v] = (await mkVal(attrFormat.id, v)).id;

  // ------------------------------- Categorias --------------------------------
  console.log('Seed: categorias...');
  const parents = ['Perifericos', 'Componentes', 'Accesorios'];
  const parentRec: Record<string, { id: string }> = {};
  let order = 1;
  for (const name of parents) {
    parentRec[name] = await prisma.category.create({ data: { name, slug: slugify(name), displayOrder: order++ } });
  }
  const promo = await prisma.category.create({
    data: { name: 'Ofertas Villano', slug: 'ofertas-villano', isPromo: true, promoBadgeText: 'OFERTA', displayOrder: order++ },
  });
  const subRec: Record<string, { id: string }> = {};
  let subOrder = 1;
  for (const [sub, parent] of Object.entries(SUB_PARENT)) {
    subRec[sub] = await prisma.category.create({
      data: { name: sub, slug: slugify(sub), parentId: parentRec[parent].id, displayOrder: subOrder++ },
    });
  }

  // ---------------------- Productos desde imagenes reales --------------------
  console.log('Seed: procesando imagenes reales y creando productos...');
  let productIdx = 0;
  const createdProductIds: string[] = [];
  let folders: { name: string }[] = [];
  if (!existsSync(SRC_IMAGES)) {
    console.warn(`Seed: no se encontro la carpeta de imagenes (${SRC_IMAGES}). Se omiten los productos.`);
    console.warn('Copia las imagenes de catalogo a esa ruta y re-ejecuta el seed.');
  } else {
    await rm(OUT_IMAGES, { recursive: true, force: true });
    await mkdir(OUT_IMAGES, { recursive: true });
    folders = (await readdir(SRC_IMAGES, { withFileTypes: true })).filter((d) => d.isDirectory());
  }

  for (const folder of folders) {
    const cfg = FOLDER_CFG[folder.name];
    if (!cfg) continue;
    const files = (await readdir(path.join(SRC_IMAGES, folder.name))).filter((f) => /\.png$/i.test(f)).sort();

    // Agrupar por producto (nombre sin sufijo _N).
    const groups = new Map<string, string[]>();
    for (const f of files) {
      const base = f.replace(/\.png$/i, '').replace(/_\d+$/, '');
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base)!.push(f);
    }

    for (const [base, imgs] of groups) {
      const seed = hash(folder.name + base);
      const rawName = titleCase(base).slice(0, 70);
      const name = rawName.length < 3 ? titleCase(folder.name) : rawName;
      const brand = BRANDS.find((b) => base.replace(/_/g, ' ').startsWith(b));
      const brandName = brand ? titleCase(brand) : null;

      const [lo, hi] = cfg.priceRange;
      const basePrice = Math.round((lo + (seed % (hi - lo))) / 5) * 5; // multiplos de 5

      // Cada 6º producto va a "Ofertas Villano" (para poblar la promo).
      const inPromo = productIdx % 6 === 0;
      const categoryId = inPromo ? promo.id : subRec[cfg.sub].id;

      const product = await prisma.product.create({
        data: {
          categoryId,
          name: brandName && !name.startsWith(brandName) ? `${brandName} ${name}` : name,
          slug: slugify(`${brand ?? cfg.sub}-${base}-${seed % 9999}`),
          description: `${name}${brandName ? ` de ${brandName}` : ''}. Producto gamer disponible en Villano Gamer Store, Santa Cruz.`,
          brand: brandName,
          basePrice,
          status: ProductStatus.activo,
        },
      });
      createdProductIds.push(product.id);
      productIdx++;

      // Imagenes: convertir cada PNG del grupo a WebP.
      let imgOrder = 0;
      for (const f of imgs.slice(0, 4)) {
        const outName = `${slugify(folder.name + '-' + base)}-${imgOrder}.webp`;
        const buf = await sharp(path.join(SRC_IMAGES, folder.name, f))
          .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        await writeFile(path.join(OUT_IMAGES, outName), buf);
        await prisma.productImage.create({
          data: { productId: product.id, urlWebp: `/uploads/seed/products/${outName}`, displayOrder: imgOrder, isPrimary: imgOrder === 0 },
        });
        imgOrder++;
      }

      // Atributos de la variante segun la categoria.
      const attrIds: string[] = [];
      if (cfg.conn) attrIds.push(connVals[cfg.conn]);
      if (cfg.mechanical) attrIds.push(switchVals[pick(['Blue', 'Red', 'Brown'], seed)]);
      if (cfg.magnetic) attrIds.push(switchVals['Magnetico']);
      if (cfg.keyboard) attrIds.push(formatVals[pick(['Full Size', 'TKL', '60%'], seed >> 3)]);

      // Stock variado para cubrir todos los estados (agotado / pocas / en stock).
      const stock = pick([0, 2, 3, 8, 12, 16, 20, 4], seed);
      const v1 = await prisma.productVariant.create({
        data: { productId: product.id, sku: `${slugify(base).toUpperCase().slice(0, 20)}-${seed % 999}`, price: basePrice, stockQuantity: stock },
      });
      const attrIds1 = [...new Set(attrIds.filter((id): id is string => Boolean(id)))];
      if (attrIds1.length) {
        await prisma.variantAttributeValue.createMany({ data: attrIds1.map((id) => ({ variantId: v1.id, attributeValueId: id })) });
      }
      // Segunda variante para teclados (otro formato) — mas realismo.
      if (cfg.keyboard) {
        const fmt2 = pick(['Full Size', 'TKL', '60%'], (seed >> 5) + 1);
        const v2 = await prisma.productVariant.create({
          data: { productId: product.id, sku: `${slugify(base).toUpperCase().slice(0, 18)}-${(seed % 999) + 1}`, price: basePrice + 40, stockQuantity: pick([0, 5, 9, 14], seed >> 2) },
        });
        const a2raw = [...(cfg.conn ? [connVals[cfg.conn]] : []), formatVals[fmt2], ...(cfg.magnetic ? [switchVals['Magnetico']] : [switchVals[pick(['Blue', 'Red', 'Brown'], seed >> 1)]])];
        const a2 = [...new Set(a2raw.filter((id): id is string => Boolean(id)))];
        if (a2.length) await prisma.variantAttributeValue.createMany({ data: a2.map((id) => ({ variantId: v2.id, attributeValueId: id })) });
      }
    }
  }
  console.log(`Seed: ${createdProductIds.length} productos creados con imagenes reales.`);

  // ------------------------------ Eventos ------------------------------------
  console.log('Seed: eventos de metricas...');
  const eventData: { productId: string; eventType: 'view' | 'add_to_cart' | 'whatsapp_click'; sessionId: string }[] = [];
  createdProductIds.forEach((id, i) => {
    const views = Math.max(2, 30 - i);
    for (let v = 0; v < views; v++) eventData.push({ productId: id, eventType: 'view', sessionId: `s-${i}-${v}` });
    for (let a = 0; a < Math.max(1, 12 - i); a++) eventData.push({ productId: id, eventType: 'add_to_cart', sessionId: `s-${i}-${a}` });
    for (let w = 0; w < Math.max(0, 6 - i); w++) eventData.push({ productId: id, eventType: 'whatsapp_click', sessionId: `s-${i}-${w}` });
  });
  await prisma.productEvent.createMany({ data: eventData });

  // ------------------------------- Tienda ------------------------------------
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
