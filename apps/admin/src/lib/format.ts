export const formatBs = (amount: number): string =>
  `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    // Con segundos: en auditoría distingue acciones repetidas en el mismo minuto.
    second: '2-digit',
  });

/** Mensaje compartido para errores de validación de formularios (login, usuarios, categorías, etc.). */
export const MSG_DATOS_INVALIDOS = 'Datos inválidos';
