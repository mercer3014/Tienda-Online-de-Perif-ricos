/** Formatea un monto en Bolivianos. */
export const formatBs = (amount: number): string =>
  `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "59174162758" -> "+591 7416 2758". Fuera del caso Bolivia (591 + 8 digitos), solo antepone "+". */
export function formatWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('591') && digits.length === 11) {
    const local = digits.slice(3);
    return `+591 ${local.slice(0, 4)} ${local.slice(4)}`;
  }
  return `+${digits}`;
}

/** Id de sesion anonima persistente (para metricas). */
export function getSessionId(): string {
  const KEY = 'villano_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
