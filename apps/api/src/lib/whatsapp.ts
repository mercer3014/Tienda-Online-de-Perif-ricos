import { env } from '../config/env.js';
import { formatBs } from './money.js';

interface WaItem {
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Arma el texto pre-cargado del pedido para WhatsApp, con tono de mensaje
 * que escribiria el cliente (no un comprobante/formulario). Muestra que
 * producto eligio y su precio; NO suma un total (eso ya lo vio en la tienda).
 */
export function buildWhatsappText(params: {
  orderNumber: string;
  items: WaItem[];
  customerName?: string | null;
  customerPhone?: string | null;
}): string {
  const intro = params.customerName
    ? `Soy ${params.customerName}${params.customerPhone ? ` (${params.customerPhone})` : ''}. `
    : '';
  const lines: string[] = [];
  lines.push(`¡Hola! ${intro}Quiero hacer este pedido:`);
  lines.push('');
  params.items.forEach((it, i) => {
    const label = it.variantLabel ? ` (${it.variantLabel})` : '';
    const price =
      it.quantity > 1 ? `${it.quantity} unidades, ${formatBs(it.unitPrice)} c/u` : formatBs(it.unitPrice);
    lines.push(`${i + 1}. ${it.productName}${label} — ${price}`);
  });
  lines.push('');
  lines.push('¿Coordinamos el pago y la entrega? ¡Gracias!');
  lines.push('');
  lines.push(`Nº de pedido: ${params.orderNumber}`);
  return lines.join('\n');
}

export function buildWhatsappUrl(text: string): string {
  const number = env.STORE_WHATSAPP_NUMBER.replace(/\D/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
