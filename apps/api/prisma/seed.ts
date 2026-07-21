/* eslint-disable no-console */
import { PrismaClient, ProductStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const DEFAULT_PASSWORD = 'Villano#2025';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../uploads/seed');

// -------------------------------------------------------------------------
// Catalogo de permisos (fuente unica; coincide con PermissionKey compartido).
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

// Matriz base rol -> permisos permitidos.
const ROLE_MATRIX: Record<string, string[]> = {
  'Super Admin': ALL_KEYS,
  'Administrador de Tienda': [
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
  ],
  'Encargado de Stock': [
    'ver_dashboard',
    'crear_producto',
    'editar_producto',
    'editar_precio',
    'editar_stock',
    'gestionar_imagenes',
    'ver_pedidos',
    'ver_metricas',
  ],
  'Personal de Marketing': [
    'ver_dashboard',
    'crear_categoria',
    'editar_categoria',
    'modificar_categoria',
    'ver_pedidos',
    'ver_metricas',
  ],
};

const USERS: { name: string; email: string; role: string }[] = [
  { name: 'Super Admin', email: 'superadmin@villano.bo', role: 'Super Admin' },
  { name: 'Ana Villano', email: 'admin@villano.bo', role: 'Administrador de Tienda' },
  { name: 'Marco Stock', email: 'stock@villano.bo', role: 'Encargado de Stock' },
  { name: 'Luz Marketing', email: 'marketing@villano.bo', role: 'Personal de Marketing' },
];

// -------------------------------------------------------------------------
// Generacion de imagenes placeholder WebP (para que el catalogo tenga visual).
// -------------------------------------------------------------------------
async function makePlaceholder(fileName: string, label: string, hue: 'purple' | 'green') {
  const bg = '#0a0c14';
  const accent = hue === 'purple' ? '#a855f7' : '#39ff14';
  const svg = `
    <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="30%" cy="20%" r="90%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
          <stop offset="60%" stop-color="${bg}" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <rect width="800" height="800" fill="${bg}"/>
      <rect width="800" height="800" fill="url(#g)"/>
      <rect x="20" y="20" width="760" height="760" fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="2"/>
      <text x="400" y="410" font-family="Segoe UI, sans-serif" font-size="52" font-weight="700"
        fill="${accent}" text-anchor="middle">${label}</text>
      <text x="400" y="470" font-family="Segoe UI, sans-serif" font-size="24"
        fill="#9aa2bd" text-anchor="middle">VILLANO GAMER STORE</text>
    </svg>`;
  const buf = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
  await writeFile(path.join(UPLOAD_DIR, fileName), buf);
  return `/uploads/seed/${fileName}`;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main() {
  console.log('Seed: limpiando datos previos...');
  // Orden respetando FKs.
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

  await mkdir(UPLOAD_DIR, { recursive: true });

  // ----------------------------- Roles & permisos -----------------------------
  console.log('Seed: roles, permisos y usuarios...');
  const permissions = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.create({ data: { key: p.key, description: p.description } }),
    ),
  );
  const permByKey = new Map(permissions.map((p) => [p.key, p]));

  for (const [roleName, allowedKeys] of Object.entries(ROLE_MATRIX)) {
    const role = await prisma.role.create({ data: { name: roleName } });
    await prisma.rolePermission.createMany({
      data: permissions.map((perm) => ({
        roleId: role.id,
        permissionId: perm.id,
        allowed: allowedKeys.includes(perm.key),
      })),
    });
  }

  const roleByName = new Map(
    (await prisma.role.findMany()).map((r) => [r.name, r]),
  );

  for (const u of USERS) {
    const role = roleByName.get(u.role)!;
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS),
        roleId: role.id,
        active: true,
      },
    });
  }

  // ------------------------------- Atributos ---------------------------------
  console.log('Seed: atributos...');
  const attrSwitch = await prisma.attribute.create({ data: { name: 'Tipo de switch' } });
  const attrConn = await prisma.attribute.create({ data: { name: 'Conectividad' } });
  const attrFormat = await prisma.attribute.create({ data: { name: 'Formato' } });

  const mkVal = (attributeId: string, value: string) =>
    prisma.attributeValue.create({ data: { attributeId, value } });

  const swBlue = await mkVal(attrSwitch.id, 'Blue');
  const swRed = await mkVal(attrSwitch.id, 'Red');
  const swBrown = await mkVal(attrSwitch.id, 'Brown');
  const connWired = await mkVal(attrConn.id, 'Cableado');
  const connWireless = await mkVal(attrConn.id, 'Inalambrico');
  const connBt = await mkVal(attrConn.id, 'Bluetooth');
  const fmtFull = await mkVal(attrFormat.id, 'Full Size');
  const fmtTkl = await mkVal(attrFormat.id, 'TKL');
  const fmt60 = await mkVal(attrFormat.id, '60%');

  // ------------------------------- Categorias --------------------------------
  console.log('Seed: categorias (arbol)...');
  const catPerifericos = await prisma.category.create({
    data: { name: 'Perifericos', slug: 'perifericos', displayOrder: 1 },
  });
  const catComponentes = await prisma.category.create({
    data: { name: 'Componentes', slug: 'componentes', displayOrder: 2 },
  });
  const catOfertas = await prisma.category.create({
    data: {
      name: 'Ofertas Villano',
      slug: 'ofertas-villano',
      isPromo: true,
      promoBadgeText: 'PROMO',
      displayOrder: 3,
    },
  });

  const subTeclados = await prisma.category.create({
    data: { name: 'Teclados Mecanicos', slug: 'teclados-mecanicos', parentId: catPerifericos.id, displayOrder: 1 },
  });
  const subMouse = await prisma.category.create({
    data: { name: 'Mouse Gamer', slug: 'mouse-gamer', parentId: catPerifericos.id, displayOrder: 2 },
  });
  const subAudio = await prisma.category.create({
    data: { name: 'Audifonos', slug: 'audifonos', parentId: catPerifericos.id, displayOrder: 3 },
  });
  const subGpu = await prisma.category.create({
    data: { name: 'Tarjetas de Video', slug: 'tarjetas-de-video', parentId: catComponentes.id, displayOrder: 1 },
  });
  const subRam = await prisma.category.create({
    data: { name: 'Memorias RAM', slug: 'memorias-ram', parentId: catComponentes.id, displayOrder: 2 },
  });

  // ------------------------------- Productos ---------------------------------
  console.log('Seed: productos, variantes e imagenes...');

  type VariantSpec = { sku: string; price: number; stock: number; attrs: { id: string }[] };
  type ProductSpec = {
    categoryId: string;
    name: string;
    slug: string;
    brand: string;
    description: string;
    basePrice: number;
    hue: 'purple' | 'green';
    variants: VariantSpec[];
  };

  const products: ProductSpec[] = [
    {
      categoryId: subTeclados.id,
      name: 'Teclado Mecanico Villano K1 RGB',
      slug: 'teclado-mecanico-villano-k1-rgb',
      brand: 'Villano',
      description: 'Teclado mecanico RGB con switches hot-swap y estructura de aluminio.',
      basePrice: 420,
      hue: 'purple',
      variants: [
        { sku: 'VK1-BLUE-TKL', price: 420, stock: 12, attrs: [swBlue, fmtTkl, connWired] },
        { sku: 'VK1-RED-FULL', price: 450, stock: 3, attrs: [swRed, fmtFull, connWired] },
        { sku: 'VK1-BROWN-60', price: 440, stock: 0, attrs: [swBrown, fmt60, connWired] },
      ],
    },
    {
      categoryId: subTeclados.id,
      name: 'Teclado Redragon Kumara Pro',
      slug: 'teclado-redragon-kumara-pro',
      brand: 'Redragon',
      description: 'Clasico TKL con retroiluminacion y switches Blue tactiles.',
      basePrice: 260,
      hue: 'green',
      variants: [
        { sku: 'RKP-BLUE-TKL', price: 260, stock: 20, attrs: [swBlue, fmtTkl, connWired] },
        { sku: 'RKP-RED-TKL', price: 275, stock: 8, attrs: [swRed, fmtTkl, connWired] },
      ],
    },
    {
      categoryId: subMouse.id,
      name: 'Mouse Villano Phantom 26K',
      slug: 'mouse-villano-phantom-26k',
      brand: 'Villano',
      description: 'Mouse ultraligero 26.000 DPI con sensor optico y switches de 80M clicks.',
      basePrice: 320,
      hue: 'purple',
      variants: [
        { sku: 'VPH-WIRELESS', price: 320, stock: 15, attrs: [connWireless] },
        { sku: 'VPH-WIRED', price: 280, stock: 4, attrs: [connWired] },
      ],
    },
    {
      categoryId: subMouse.id,
      name: 'Mouse Logitech G Pro X Superlight',
      slug: 'mouse-logitech-g-pro-x-superlight',
      brand: 'Logitech',
      description: 'Mouse inalambrico de competicion, 63g, sensor HERO 25K.',
      basePrice: 690,
      hue: 'green',
      variants: [{ sku: 'LGPX-WL', price: 690, stock: 6, attrs: [connWireless] }],
    },
    {
      categoryId: subAudio.id,
      name: 'Audifonos HyperX Cloud III',
      slug: 'audifonos-hyperx-cloud-iii',
      brand: 'HyperX',
      description: 'Audifonos gamer con sonido espacial y microfono desmontable.',
      basePrice: 540,
      hue: 'purple',
      variants: [
        { sku: 'HX3-WIRED', price: 540, stock: 9, attrs: [connWired] },
        { sku: 'HX3-BT', price: 620, stock: 2, attrs: [connBt] },
      ],
    },
    {
      categoryId: subGpu.id,
      name: 'Tarjeta de Video RTX 4060 Ti 8GB',
      slug: 'tarjeta-de-video-rtx-4060-ti-8gb',
      brand: 'NVIDIA',
      description: 'GPU para 1080p/1440p con DLSS 3 y ray tracing.',
      basePrice: 2850,
      hue: 'green',
      variants: [{ sku: 'RTX4060TI-8G', price: 2850, stock: 5, attrs: [] }],
    },
    {
      categoryId: subGpu.id,
      name: 'Tarjeta de Video RX 7700 XT 12GB',
      slug: 'tarjeta-de-video-rx-7700-xt-12gb',
      brand: 'AMD',
      description: 'GPU de gama media-alta para 1440p de alto rendimiento.',
      basePrice: 3200,
      hue: 'purple',
      variants: [{ sku: 'RX7700XT-12G', price: 3200, stock: 0, attrs: [] }],
    },
    {
      categoryId: subRam.id,
      name: 'Memoria RAM Villano Neon 32GB DDR5',
      slug: 'memoria-ram-villano-neon-32gb-ddr5',
      brand: 'Villano',
      description: 'Kit 2x16GB DDR5 6000MHz con disipador y RGB direccionable.',
      basePrice: 780,
      hue: 'green',
      variants: [
        { sku: 'VRAM-32-6000', price: 780, stock: 14, attrs: [] },
        { sku: 'VRAM-16-6000', price: 430, stock: 3, attrs: [] },
      ],
    },
  ];

  let idx = 0;
  for (const p of products) {
    idx += 1;
    const product = await prisma.product.create({
      data: {
        categoryId: p.categoryId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        brand: p.brand,
        basePrice: p.basePrice,
        status: ProductStatus.activo,
      },
    });

    // Imagenes (2 por producto).
    const img1 = await makePlaceholder(`${p.slug}-1.webp`, esc(p.brand), p.hue);
    const img2 = await makePlaceholder(`${p.slug}-2.webp`, esc(`0${idx}`), p.hue === 'purple' ? 'green' : 'purple');
    await prisma.productImage.createMany({
      data: [
        { productId: product.id, urlWebp: img1, displayOrder: 0, isPrimary: true },
        { productId: product.id, urlWebp: img2, displayOrder: 1, isPrimary: false },
      ],
    });

    for (const v of p.variants) {
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          price: v.price,
          stockQuantity: v.stock,
        },
      });
      if (v.attrs.length) {
        await prisma.variantAttributeValue.createMany({
          data: v.attrs.map((a) => ({ variantId: variant.id, attributeValueId: a.id })),
        });
      }
    }
  }

  // Algunos eventos para que las metricas no salgan vacias.
  console.log('Seed: eventos de metricas de ejemplo...');
  const allProducts = await prisma.product.findMany({ select: { id: true } });
  const eventData: { productId: string; eventType: 'view' | 'add_to_cart' | 'whatsapp_click'; sessionId: string }[] = [];
  allProducts.forEach((prod, i) => {
    const views = 20 - i;
    for (let v = 0; v < views; v++) eventData.push({ productId: prod.id, eventType: 'view', sessionId: `sess-${i}-${v}` });
    for (let a = 0; a < Math.max(1, 8 - i); a++) eventData.push({ productId: prod.id, eventType: 'add_to_cart', sessionId: `sess-${i}-${a}` });
    for (let w = 0; w < Math.max(0, 4 - i); w++) eventData.push({ productId: prod.id, eventType: 'whatsapp_click', sessionId: `sess-${i}-${w}` });
  });
  await prisma.productEvent.createMany({ data: eventData });

  // ------------------------------- Horario -----------------------------------
  console.log('Seed: horario y ubicacion...');
  // 0=domingo ... 6=sabado. Lun-Vie 09:00-20:00, Sab 10:00-21:00, Dom cerrado.
  const hours = [
    { dayOfWeek: 0, openTime: '00:00', closeTime: '00:00', isClosed: true },
    { dayOfWeek: 1, openTime: '09:00', closeTime: '20:00', isClosed: false },
    { dayOfWeek: 2, openTime: '09:00', closeTime: '20:00', isClosed: false },
    { dayOfWeek: 3, openTime: '09:00', closeTime: '20:00', isClosed: false },
    { dayOfWeek: 4, openTime: '09:00', closeTime: '20:00', isClosed: false },
    { dayOfWeek: 5, openTime: '09:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 6, openTime: '10:00', closeTime: '21:00', isClosed: false },
  ];
  await prisma.businessHour.createMany({ data: hours });

  await prisma.storeLocation.create({
    data: {
      mallName: 'Ventura Mall',
      address: 'Av. San Martin, Equipetrol, Santa Cruz de la Sierra',
      passageNumber: 'Pasaje 3',
      localeNumber: 'Local 214',
      latitude: -17.7592,
      longitude: -63.1975,
      googleMapsUrl: 'https://maps.google.com/?q=-17.7592,-63.1975',
      wazeUrl: 'https://waze.com/ul?ll=-17.7592,-63.1975&navigate=yes',
    },
  });

  console.log('Seed: completado OK.');
}

main()
  .catch((e) => {
    console.error('Seed fallo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
