import { Prisma } from '@prisma/client';
import type {
  CreateOrderInput,
  CreatedOrderResponse,
  OrderDTO,
  OrderStatus,
  UpdateOrderStatusInput,
} from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
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

function isOrderNumberCollision(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === 'P2002' &&
    Array.isArray((e.meta as { target?: unknown })?.target) &&
    ((e.meta as { target: string[] }).target).includes('order_number')
  );
}

/**
 * Crea una orden a partir del carrito. El backend RECALCULA precios desde la
 * base (nunca confia en los que envia el cliente), valida stock disponible y
 * DESCUENTA el stock de forma atomica dentro de una transaccion: el update
 * usa una condicion `stockQuantity >= cantidad` para que, si dos clientes
 * compiten por la ultima unidad, solo uno gane (el otro recibe 400 y debe
 * refrescar su carrito) en vez de sobrevender.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrderResponse> {
  // Combina cantidades si el carrito repite la misma variante en mas de una linea,
  // para validar/descontar el stock real total en vez de chequear cada linea por separado.
  const qtyByVariant = new Map<string, number>();
  for (const item of input.items) {
    qtyByVariant.set(item.variantId, (qtyByVariant.get(item.variantId) ?? 0) + item.quantity);
  }

  const { order, itemsData, total } = await prisma.$transaction(async (tx) => {
    const variants = await tx.productVariant.findMany({
      where: { id: { in: [...qtyByVariant.keys()] } },
      include: { product: true, attributeValues: { include: { attributeValue: true } } },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    for (const [variantId, qty] of qtyByVariant) {
      const v = byId.get(variantId);
      if (!v) throw badRequest(`La variante ${variantId} no existe`);
      if (v.product.status !== 'activo') throw badRequest(`El producto "${v.product.name}" no esta disponible`);
      if (v.stockQuantity <= 0) throw badRequest(`"${v.product.name}" esta agotado`);
      if (qty > v.stockQuantity) throw badRequest(`Solo quedan ${v.stockQuantity} unidades de "${v.product.name}"`);
    }

    // Descuento atomico y condicional: si el stock cambio entre la lectura y
    // este punto (otra compra concurrente), el updateMany afecta 0 filas.
    for (const [variantId, qty] of qtyByVariant) {
      const res = await tx.productVariant.updateMany({
        where: { id: variantId, stockQuantity: { gte: qty } },
        data: { stockQuantity: { decrement: qty } },
      });
      if (res.count === 0) {
        const v = byId.get(variantId)!;
        throw conflict(`"${v.product.name}" ya no tiene stock suficiente. Actualiza tu carrito e intenta de nuevo.`);
      }
    }

    // Calculo con Prisma.Decimal (no numeros flotantes de JS): sumar varios
    // items con centavos en punto flotante puede acumular error de
    // redondeo antes de volver a guardarse en columnas Decimal(12,2).
    const itemsData = input.items.map((item) => {
      const v = byId.get(item.variantId)!;
      const unitPrice = v.price; // ya es Prisma.Decimal (lectura de la DB)
      const subtotal = unitPrice.mul(item.quantity);
      return {
        variantId: v.id,
        productName: v.product.name,
        variantLabel: variantLabel(v.attributeValues),
        quantity: item.quantity,
        unitPrice,
        subtotal,
      };
    });
    const total = itemsData.reduce((s, i) => s.add(i.subtotal), new Prisma.Decimal(0));

    // Reintenta ante colision del numero de pedido (muy improbable, pero el
    // campo es unico y no queremos perder la venta por eso).
    let order;
    for (let attempt = 1; ; attempt++) {
      try {
        order = await tx.order.create({
          data: {
            orderNumber: genOrderNumber(),
            customerName: input.customerName ?? null,
            customerPhone: input.customerPhone ?? null,
            deliveryMethod: input.deliveryMethod ?? 'retiro',
            totalAmount: total,
            status: 'pendiente',
            items: { create: itemsData },
          },
          include: { items: true },
        });
        break;
      } catch (e) {
        if (isOrderNumberCollision(e) && attempt < 3) continue;
        throw e;
      }
    }

    return { order, itemsData, total };
  });

  // El mensaje de WhatsApp es solo texto: convertir a number aca (una vez, ya
  // sumado con precision) en vez de haber operado en float desde el inicio.
  const whatsappText = buildWhatsappText({
    orderNumber: order.orderNumber,
    items: itemsData.map((i) => ({ ...i, unitPrice: toNumber(i.unitPrice), subtotal: toNumber(i.subtotal) })),
    total: toNumber(total),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    deliveryMethod: input.deliveryMethod ?? 'retiro',
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

/** Version sin paginar de listOrders, para exportacion a CSV. Tope duro de 5000 filas. */
export async function listOrdersForExport(params: { status?: OrderStatus; from?: string; to?: string }) {
  const where: Prisma.OrderWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = new Date(params.from);
    if (params.to) where.createdAt.lte = new Date(params.to);
  }
  const rows = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
  return rows.map((o) => ({ ...serializeOrder(o), itemCount: o.items.reduce((s, i) => s + i.quantity, 0) }));
}

export async function getOrder(id: string): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw notFound('Pedido no encontrado');
  return serializeOrder(order);
}

// Transiciones de estado permitidas. Cancelar restaura el stock reservado;
// reactivar desde cancelado lo vuelve a descontar (si ya no alcanza, se rechaza).
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pendiente: ['coordinado', 'cancelado'],
  coordinado: ['pendiente', 'completado', 'cancelado'],
  completado: ['cancelado'],
  cancelado: ['pendiente'],
};

export async function changeOrderStatus(id: string, input: UpdateOrderStatusInput, userId: string): Promise<OrderDTO> {
  const existing = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!existing) throw notFound('Pedido no encontrado');

  if (input.status === existing.status) throw conflict(`El pedido ya esta en estado "${input.status}"`);
  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(input.status)) {
    throw badRequest(`No se puede pasar de "${existing.status}" a "${input.status}". Transiciones validas: ${allowed.join(', ') || 'ninguna'}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Cancelar: restaura el stock reservado por cada item (si la variante sigue existiendo).
    if (input.status === 'cancelado') {
      for (const item of existing.items) {
        if (item.variantId) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQuantity: { increment: item.quantity } } });
        }
      }
    }
    // Reactivar desde cancelado: vuelve a descontar, atomico y condicional.
    if (existing.status === 'cancelado' && input.status !== 'cancelado') {
      for (const item of existing.items) {
        if (!item.variantId) continue;
        const res = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (res.count === 0) {
          throw conflict(`"${item.productName}" ya no tiene stock suficiente para reactivar este pedido.`);
        }
      }
    }
    return tx.order.update({ where: { id }, data: { status: input.status }, include: { items: true } });
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
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryMethod: order.deliveryMethod,
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
