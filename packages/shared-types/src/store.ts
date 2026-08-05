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
  /** Resueltas automaticamente por el backend a partir de googleMapsUrl (el
   * admin nunca las escribe a mano); alimentan el mapa embebido del sitio publico. */
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
}

export interface StoreStatusDTO {
  isOpen: boolean;
  now: string; // ISO en hora de Bolivia
  timezone: string;
  todayHours: { openTime: string; closeTime: string } | null;
  location: StoreLocationDTO | null;
  hours: BusinessHourDTO[];
  whatsappNumber: string;
  /** Anuncio corto opcional (ej. "Cerrado por feriado"), null si no hay ninguno activo. */
  announcement: string | null;
}

const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;

export const businessHourInputSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(hhmm, 'Formato HH:mm'),
  closeTime: z.string().regex(hhmm, 'Formato HH:mm'),
  isClosed: z.boolean(),
});
export type BusinessHourInput = z.infer<typeof businessHourInputSchema>;

/** Todo el formulario de Configuracion se guarda junto (whatsapp + ubicacion + horarios + anuncio). */
export const updateStoreSettingsSchema = z.object({
  // Solo digitos, formato internacional sin "+" (ej. 59174162758).
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^\d{8,15}$/, 'Debe tener solo digitos en formato internacional (8-15 digitos), sin espacios ni "+"'),
  mallName: z.string().trim().max(160),
  address: z.string().trim().max(240),
  passageNumber: z.string().trim().max(30).nullable(),
  localeNumber: z.string().trim().max(30).nullable(),
  // Sin latitude/longitude: el admin pega el link de Google Maps y el backend
  // resuelve las coordenadas solo (ver resolveGoogleMapsCoords en la API).
  googleMapsUrl: z.string().trim().max(500).nullable(),
  announcement: z.string().trim().max(280).nullable(),
  hours: z
    .array(businessHourInputSchema)
    .length(7, 'Deben venir los 7 dias de la semana')
    .refine((arr) => new Set(arr.map((h) => h.dayOfWeek)).size === 7, 'Los 7 dias deben ser distintos (0 a 6, sin repetir)'),
});
export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsSchema>;

export interface StoreSettingsDTO {
  whatsappNumber: string;
  location: StoreLocationDTO;
  hours: BusinessHourDTO[];
  announcement: string | null;
}

export interface MetricsSummaryDTO {
  mostViewed: { productId: string; name: string; count: number }[];
  mostAddedToCart: { productId: string; name: string; count: number }[];
  mostOrdered: { productId: string; name: string; count: number }[];
  lowStock: { variantId: string; sku: string; productName: string; stockQuantity: number }[];
  cartAbandonment: { addToCart: number; whatsappClick: number; rate: number };
}
