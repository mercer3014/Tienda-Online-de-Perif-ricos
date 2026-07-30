import type { DeliveryMethod } from '@villano/shared-types';
import { DELIVERY_METHOD_LABEL } from '@villano/shared-types';
import { env } from '../config/env.js';
import { formatBs } from './money.js';

interface WaItem {
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/** Arma el texto pre-cargado del pedido para WhatsApp. */
export function buildWhatsappText(params: {
  orderNumber: string;
  items: WaItem[];
  total: number;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryMethod: DeliveryMethod;
}): string {
  const lines: string[] = [];
  lines.push('*VILLANO GAMER STORE*');
  lines.push('Nuevo pedido');
  lines.push(`Pedido: ${params.orderNumber}`);
  lines.push('');
  params.items.forEach((it, i) => {
    const label = it.variantLabel ? ` (${it.variantLabel})` : '';
    lines.push(`${i + 1}. ${it.productName}${label}`);
    lines.push(`   ${it.quantity} x ${formatBs(it.unitPrice)} = ${formatBs(it.subtotal)}`);
  });
  lines.push('');
  lines.push(`*TOTAL: ${formatBs(params.total)}*`);
  lines.push(`Entrega: ${DELIVERY_METHOD_LABEL[params.deliveryMethod]}`);
  if (params.customerName) lines.push(`Nombre: ${params.customerName}`);
  if (params.customerPhone) lines.push(`Contacto: ${params.customerPhone}`);
  lines.push('');
  lines.push('Quiero coordinar el pago y la entrega. ¡Gracias!');
  return lines.join('\n');
}

export function buildWhatsappUrl(text: string): string {
  const number = env.STORE_WHATSAPP_NUMBER.replace(/\D/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
