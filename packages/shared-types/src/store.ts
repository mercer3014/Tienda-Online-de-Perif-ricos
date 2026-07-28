import { z } from 'zod';
import { ProductEventType } from './enums.js';
import { uuidSchema } from './common.js';

/** Registro anonimo de evento de producto (metricas). */
export const trackEventSchema = z.object({
  productId: uuidSchema,
  eventType: ProductEventType,
  sessionId: z.string().trim().min(1).max(120),
});
export type TrackEventInput = z.infer<typeof trackEventSchema>;

export interface BusinessHourDTO {
  dayOfWeek: number; // 0=domingo ... 6=sabado
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  isClosed: boolean;
}

export interface StoreLocationDTO {
  mallName: string;
  address: string;
  passageNumber: string | null;
  localeNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  wazeUrl: string | null;
}

export interface StoreStatusDTO {
  isOpen: boolean;
  now: string; // ISO en hora de Bolivia
  timezone: string;
  todayHours: { openTime: string; closeTime: string } | null;
  location: StoreLocationDTO | null;
  hours: BusinessHourDTO[];
  whatsappNumber: string;
}

export interface MetricsSummaryDTO {
  mostViewed: { productId: string; name: string; count: number }[];
  mostAddedToCart: { productId: string; name: string; count: number }[];
  mostOrdered: { productId: string; name: string; count: number }[];
  lowStock: { variantId: string; sku: string; productName: string; stockQuantity: number }[];
  cartAbandonment: { addToCart: number; whatsappClick: number; rate: number };
}
