import { Prisma } from '@prisma/client';

/** Convierte un Decimal de Prisma a number para los DTOs de salida. */
export const toNumber = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : typeof d === 'number' ? d : Number(d);

/** Formatea un monto en Bolivianos para el mensaje de WhatsApp. */
export const formatBs = (amount: number): string =>
  `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
