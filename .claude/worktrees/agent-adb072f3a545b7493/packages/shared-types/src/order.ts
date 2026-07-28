import { z } from 'zod';
import { uuidSchema } from './common.js';
import { OrderStatus } from './enums.js';

/** Un item del carrito enviado al crear la orden. El backend recalcula precios. */
export const orderItemInputSchema = z.object({
  variantId: uuidSchema,
  quantity: z.coerce.number().int().min(1).max(999),
});

export const createOrderSchema = z.object({
  customerPhone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{6,20}$/, 'Telefono invalido')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  items: z.array(orderItemInputSchema).min(1, 'El carrito esta vacio'),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: OrderStatus,
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export interface OrderItemDTO {
  id: string;
  variantId: string | null;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  customerPhone: string | null;
  totalAmount: number;
  status: OrderStatus;
  whatsappSent: boolean;
  items: OrderItemDTO[];
  createdAt: string;
}

/** Respuesta al crear la orden: incluye el texto listo para wa.me. */
export interface CreatedOrderResponse {
  order: OrderDTO;
  whatsappUrl: string;
  whatsappText: string;
}
