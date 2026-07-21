import type { StoreStatusDTO } from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { isStoreOpen } from '../../lib/storeStatus.js';

export async function getStoreStatus(): Promise<StoreStatusDTO> {
  const [hoursRows, location] = await Promise.all([
    prisma.businessHour.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    prisma.storeLocation.findFirst(),
  ]);

  const { isOpen, today, nowIso } = isStoreOpen(hoursRows);

  return {
    isOpen,
    now: nowIso,
    timezone: env.STORE_TIMEZONE,
    todayHours: today && !today.isClosed ? { openTime: today.openTime, closeTime: today.closeTime } : null,
    location: location
      ? {
          mallName: location.mallName,
          address: location.address,
          passageNumber: location.passageNumber,
          localeNumber: location.localeNumber,
          latitude: location.latitude,
          longitude: location.longitude,
          googleMapsUrl: location.googleMapsUrl,
          wazeUrl: location.wazeUrl,
        }
      : null,
    hours: hoursRows.map((h) => ({ dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime })),
    whatsappNumber: env.STORE_WHATSAPP_NUMBER,
  };
}
