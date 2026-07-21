import { env } from '../config/env.js';

/**
 * Obtiene la hora local (dia de semana y minutos desde medianoche) en la
 * zona horaria de la tienda (Bolivia), sin depender de la TZ del servidor.
 */
export function nowInStoreTz(): { dayOfWeek: number; minutes: number; iso: string } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: env.STORE_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  let hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  if (hour === 24) hour = 0; // Intl puede devolver 24 a medianoche.

  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dayOfWeek: map[weekdayStr] ?? 0,
    minutes: hour * 60 + minute,
    iso: now.toISOString(),
  };
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export interface HourRow {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

/** Determina si la tienda esta abierta AHORA contra el horario configurado. */
export function isStoreOpen(hours: HourRow[]): {
  isOpen: boolean;
  today: HourRow | null;
  nowIso: string;
} {
  const { dayOfWeek, minutes, iso } = nowInStoreTz();
  const today = hours.find((h) => h.dayOfWeek === dayOfWeek) ?? null;
  if (!today || today.isClosed) return { isOpen: false, today, nowIso: iso };

  const open = toMinutes(today.openTime);
  const close = toMinutes(today.closeTime);
  const isOpen = minutes >= open && minutes < close;
  return { isOpen, today, nowIso: iso };
}
