import type {
  CreateOrderInput,
  CreatedOrderResponse,
  OrderDTO,
  OrderStatus,
  UpdateOrderStatusInput,
} from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { toNumber } from '../../lib/money.js';
import { buildWhatsappText, buildWhatsappUrl } from '../../lib/whatsapp.js';

function genOrderNumber(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VG-${stamp}-${rand}`;
}

function variantLabel(attrs: { attributeValue: { value: string } }[]): string {
  return attrs.map((a) => a.attributeValue.value).join(' / ');
}

/**
 * Crea una orden a partir del carrito. El backend RECALCULA precios desde la
 * base (nunca confia en los que envia el cliente) y valida stock disponible.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrderResponse> {
  const variantIds = input.items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: true,
      attributeValues: { include: { attributeValue: true } },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  // Validaciones: existencia, producto activo y stock suficiente.
  for (const item of input.items) {
    const v = byId.get(item.variantId);
    if (!v) throw badRequest(`La variante ${item.variantId} no existe`);
    if (v.product.status !== 'activo') throw badRequest(`El producto "${v.product.name}" no esta disponible`);
    if (v.stockQuantity <= 0) throw badRequest(`"${v.product.name}" esta agotado`);
    if (item.quantity > v.stockQuantity) {
      throw badRequest(`Solo quedan ${v.stockQuantity} unidades de "${v.product.name}"`);
    }
  }

  const itemsData = input.items.map((item) => {
    const v = byId.get(item.variantId)!;
    const unitPrice = toNumber(v.price);
    const subtotal = unitPrice * item.quantity;
    return {
      variantId: v.id,
      productName: v.product.name,
      variantLabel: variantLabel(v.attributeValues),
      quantity: item.quantity,
      unitPrice,
      subtotal,
    };
  });
  const total = itemsData.reduce((s, i) => s + i.subtotal, 0);
  const orderNumber = genOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerPhone: input.customerPhone ?? null,
      totalAmount: total,
      status: 'pendiente',
      items: { create: itemsData },
    },
    include: { items: true },
  });

  const whatsappText = buildWhatsappText({
    orderNumber,
    items: itemsData,
    total,
    customerPhone: input.customerPhone,
  });
  const whatsappUrl = buildWhatsappUrl(whatsappText);

  return { order: serializeOrder(order), whatsappUrl, whatsappText };
}

/** Marca whatsapp_sent = true (el frontend lo llama antes de redirigir a wa.me). */
export async function markWhatsappSent(orderId: string): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw notFound('Pedido no encontrado');
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { whatsappSent: true },
    include: { items: true },
  });
  return serializeOrder(updated);
}

export async function listOrders(params: { status?: OrderStatus; page: number; pageSize: number }) {
  const where = params.status ? { status: params.status } : {};
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);
  return { items: rows.map(serializeOrder), total };
}

export async function getOrder(id: string): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw notFound('Pedido no encontrado');
  return serializeOrder(order);
}

export async function changeOrderStatus(id: string, input: UpdateOrderStatusInput, userId: string): Promise<OrderDTO> {
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw notFound('Pedido no encontrado');
  const updated = await prisma.order.update({
    where: { id },
    data: { status: input.status },
    include: { items: true },
  });
  await writeAudit({
    userId, action: 'cambiar_estado_pedido', entityType: 'order', entityId: id,
    oldValue: { status: existing.status }, newValue: { status: input.status },
  });
  return serializeOrder(updated);
}

type OrderRow = Awaited<ReturnType<typeof prisma.order.findUniqueOrThrow>> & {
  items: Awaited<ReturnType<typeof prisma.orderItem.findMany>>;
};

function serializeOrder(order: OrderRow): OrderDTO {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerPhone: order.customerPhone,
    totalAmount: toNumber(order.totalAmount),
    status: order.status,
    whatsappSent: order.whatsappSent,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((it) => ({
      id: it.id,
      variantId: it.variantId,
      productName: it.productName,
      variantLabel: it.variantLabel,
      quantity: it.quantity,
      unitPrice: toNumber(it.unitPrice),
      subtotal: toNumber(it.subtotal),
    })),
  };
}
