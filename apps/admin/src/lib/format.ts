export const formatBs = (amount: number): string =>
  `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
