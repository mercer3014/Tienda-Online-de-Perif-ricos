import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { deleteProductImage, saveProductImage } from '../../lib/imageStorage.js';

/**
 * Procesa una imagen con Sharp (redimension + compresion + WebP) y la guarda.
 * Convierte SIEMPRE a WebP antes de almacenar.
 */
export async function processAndStoreImage(
  productId: string,
  file: { buffer: Buffer; mimetype: string },
  userId: string,
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw notFound('Producto no encontrado');
  if (!file.mimetype.startsWith('image/')) throw badRequest('El archivo no es una imagen valida');

  const fileName = `${productId}-${randomUUID()}.webp`;

  let webp: Buffer;
  try {
    webp = await sharp(file.buffer)
      .rotate() // respeta orientacion EXIF
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw badRequest('No se pudo procesar la imagen (formato no soportado o corrupta)');
  }
  const urlWebp = await saveProductImage(fileName, webp);

  const existingCount = await prisma.productImage.count({ where: { productId } });
  const image = await prisma.productImage.create({
    data: {
      productId,
      urlWebp,
      displayOrder: existingCount,
      isPrimary: existingCount === 0, // la primera imagen es la principal
    },
  });

  await writeAudit({ userId, action: 'gestionar_imagenes', entityType: 'product', entityId: productId, newValue: { added: urlWebp } });

  // Datos de compresion para mostrar el ahorro real al usuario.
  const originalBytes = file.buffer.length;
  const webpBytes = webp.length;
  const savedPct = originalBytes > 0 ? Math.round((1 - webpBytes / originalBytes) * 100) : 0;
  return { ...image, compression: { originalBytes, webpBytes, savedPct } };
}

export async function setPrimaryImage(imageId: string, userId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) throw notFound('Imagen no encontrada');
  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId: image.productId }, data: { isPrimary: false } }),
    prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);
  await writeAudit({ userId, action: 'gestionar_imagenes', entityType: 'product', entityId: image.productId, newValue: { primary: image.urlWebp } });
  return prisma.productImage.findMany({ where: { productId: image.productId }, orderBy: { displayOrder: 'asc' } });
}

export async function deleteImage(imageId: string, userId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) throw notFound('Imagen no encontrada');

  await prisma.productImage.delete({ where: { id: imageId } });

  await deleteProductImage(image.urlWebp);

  // Si borramos la principal, promover otra.
  if (image.isPrimary) {
    const next = await prisma.productImage.findFirst({
      where: { productId: image.productId },
      orderBy: { displayOrder: 'asc' },
    });
    if (next) await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
  }

  await writeAudit({ userId, action: 'gestionar_imagenes', entityType: 'product', entityId: image.productId, oldValue: { removed: image.urlWebp } });
  return { id: imageId };
}
