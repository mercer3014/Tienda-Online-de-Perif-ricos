import { DELIVERY_METHOD_LABEL, type DeliveryMethod } from '@villano/shared-types';
import type { CartItem } from '../store/cart';
import { formatBs } from './format';

function toWaUrl(number: string, text: string): string {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Link de WhatsApp para pedir aviso de reposicion de un producto agotado. */
export function buildNotifyWhatsappUrl(whatsappNumber: string, productName: string): string {
  const text = `Hola! Quiero que me avisen cuando vuelva a haber stock de: ${productName}`;
  return toWaUrl(whatsappNumber, text);
}

/**
 * Preview del mensaje que se va a enviar al finalizar el pedido. Replica el
 * formato de apps/api/src/lib/whatsapp.ts (el texto real lo arma el backend
 * con el numero de pedido definitivo; aca es solo una vista previa).
 */
export function buildOrderPreviewText(params: {
  items: CartItem[];
  total: number;
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
}): string {
  const lines: string[] = [];
  lines.push('*VILLANO GAMER STORE*');
  lines.push('Nuevo pedido');
  lines.push('Pedido: (se genera al confirmar)');
  lines.push('');
  params.items.forEach((it, i) => {
    const label = it.variantLabel ? ` (${it.variantLabel})` : '';
    lines.push(`${i + 1}. ${it.productName}${label}`);
    lines.push(`   ${it.quantity} x ${formatBs(it.unitPrice)} = ${formatBs(it.unitPrice * it.quantity)}`);
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
