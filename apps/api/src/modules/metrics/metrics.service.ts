import type { MetricsSummaryDTO, TrackEventInput } from '@villano/shared-types';
import { STOCK_THRESHOLD_LOW } from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { badRequest } from '../../lib/errors.js';

export async function trackEvent(input: TrackEventInput) {
  const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } });
  if (!product) throw badRequest('Producto inexistente');
  await prisma.productEvent.create({
    data: { productId: input.productId, eventType: input.eventType, sessionId: input.sessionId },
  });
  return { ok: true };
}

async function topByEvent(eventType: 'view' | 'add_to_cart', limit = 5) {
  const grouped = await prisma.productEvent.groupBy({
    by: ['productId'],
    where: { eventType },
    _count: { _all: true },
    orderBy: { _count: { productId: 'desc' } },
    take: limit,
  });
  const ids = grouped.map((g) => g.productId);
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  return grouped.map((g) => ({ productId: g.productId, name: nameById.get(g.productId) ?? '—', count: g._count._all }));
}

export async function getMetricsSummary(): Promise<MetricsSummaryDTO> {
  const [mostViewed, mostAddedToCart] = await Promise.all([
    topByEvent('view'),
    topByEvent('add_to_cart'),
  ]);

  // Mas pedidos: por cantidad total en order_items agrupado por producto (via variante->producto).
  const orderedRaw = await prisma.$queryRaw<{ product_id: string; name: string; count: bigint }[]>`
    SELECT p.id AS product_id, p.name AS name, SUM(oi.quantity)::bigint AS count
    FROM order_items oi
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    GROUP BY p.id, p.name
    ORDER BY count DESC
    LIMIT 5`;
  const mostOrdered = orderedRaw.map((r) => ({ productId: r.product_id, name: r.name, count: Number(r.count) }));

  // Stock bajo/agotado.
  const lowVariants = await prisma.productVariant.findMany({
    where: { stockQuantity: { lt: STOCK_THRESHOLD_LOW } },
    include: { product: { select: { name: true } } },
    orderBy: { stockQuantity: 'asc' },
    take: 20,
  });
  const lowStock = lowVariants.map((v) => ({
    variantId: v.id, sku: v.sku, productName: v.product.name, stockQuantity: v.stockQuantity,
  }));

  // Abandono de carrito: add_to_cart vs whatsapp_click.
  const [addToCart, whatsappClick] = await Promise.all([
    prisma.productEvent.count({ where: { eventType: 'add_to_cart' } }),
    prisma.productEvent.count({ where: { eventType: 'whatsapp_click' } }),
  ]);
  const rate = addToCart > 0 ? Math.round((1 - whatsappClick / addToCart) * 100) / 100 : 0;

  return {
    mostViewed,
    mostAddedToCart,
    mostOrdered,
    lowStock,
    cartAbandonment: { addToCart, whatsappClick, rate },
  };
}
