import type { StoreLocationDTO, StoreSettingsDTO, StoreStatusDTO, UpdateStoreSettingsInput } from '@villano/shared-types';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { isStoreOpen } from '../../lib/storeStatus.js';
import { writeAudit } from '../../lib/audit.js';
import { resolveGoogleMapsCoords } from '../../lib/googleMaps.js';

type LocationRow = {
  mallName: string;
  address: string;
  passageNumber: string | null;
  localeNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
} | null;

function toLocationDTO(location: LocationRow): StoreLocationDTO {
  return {
    mallName: location?.mallName ?? '',
    address: location?.address ?? '',
    passageNumber: location?.passageNumber ?? null,
    localeNumber: location?.localeNumber ?? null,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    googleMapsUrl: location?.googleMapsUrl ?? null,
  };
}

/** El numero configurado en la DB manda; STORE_WHATSAPP_NUMBER del .env es
 * solo el respaldo para cuando todavia no se cargo ninguno desde el panel. */
export async function getEffectiveWhatsappNumber(): Promise<string> {
  const location = await prisma.storeLocation.findFirst();
  return location?.whatsappNumber || env.STORE_WHATSAPP_NUMBER;
}

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
    location: location ? toLocationDTO(location) : null,
    hours: hoursRows.map((h) => ({ dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed })),
    whatsappNumber: location?.whatsappNumber || env.STORE_WHATSAPP_NUMBER,
    announcement: location?.announcement || null,
  };
}

export async function getStoreSettings(): Promise<StoreSettingsDTO> {
  const [hoursRows, location] = await Promise.all([
    prisma.businessHour.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    prisma.storeLocation.findFirst(),
  ]);

  return {
    whatsappNumber: location?.whatsappNumber || env.STORE_WHATSAPP_NUMBER,
    location: toLocationDTO(location),
    hours: hoursRows.map((h) => ({ dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed })),
    announcement: location?.announcement || null,
  };
}

/** Actualiza (o crea, si todavia no existe ninguna fila) toda la configuracion
 * de la tienda -whatsapp, ubicacion, horarios y anuncio- en una transaccion. */
export async function updateStoreSettings(input: UpdateStoreSettingsInput, userId: string): Promise<StoreSettingsDTO> {
  const existing = await prisma.storeLocation.findFirst();
  const oldSnapshot = {
    whatsappNumber: existing?.whatsappNumber || env.STORE_WHATSAPP_NUMBER,
    mallName: existing?.mallName ?? '',
    address: existing?.address ?? '',
    announcement: existing?.announcement ?? null,
  };

  const googleMapsUrl = input.googleMapsUrl || null;
  // El admin no toca lat/long a mano: se resuelven del link de Google Maps.
  // Si el link no cambio, no vale la pena volver a resolverlo (evita una
  // llamada de red de mas en cada guardado que no toco la ubicacion).
  const urlChanged = googleMapsUrl !== (existing?.googleMapsUrl ?? null);
  const coords = !googleMapsUrl
    ? { latitude: null, longitude: null }
    : urlChanged
      ? await resolveGoogleMapsCoords(googleMapsUrl).then((c) => c ?? { latitude: null, longitude: null })
      : { latitude: existing!.latitude, longitude: existing!.longitude };

  const locationData = {
    whatsappNumber: input.whatsappNumber,
    mallName: input.mallName,
    address: input.address,
    passageNumber: input.passageNumber || null,
    localeNumber: input.localeNumber || null,
    googleMapsUrl,
    latitude: coords.latitude,
    longitude: coords.longitude,
    announcement: input.announcement || null,
  };

  const updatedLocation = await prisma.$transaction(async (tx) => {
    const location = existing
      ? await tx.storeLocation.update({ where: { id: existing.id }, data: locationData })
      : await tx.storeLocation.create({ data: locationData });

    for (const h of input.hours) {
      await tx.businessHour.upsert({
        where: { dayOfWeek: h.dayOfWeek },
        create: { dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
        update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
      });
    }

    return location;
  });

  await writeAudit({
    userId,
    action: 'editar_configuracion',
    entityType: 'store_settings',
    entityId: updatedLocation.id,
    oldValue: oldSnapshot,
    newValue: {
      whatsappNumber: updatedLocation.whatsappNumber,
      mallName: updatedLocation.mallName,
      address: updatedLocation.address,
      announcement: updatedLocation.announcement,
    },
  });

  return getStoreSettings();
}
