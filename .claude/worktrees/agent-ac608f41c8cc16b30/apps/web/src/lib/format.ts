/** Formatea un monto en Bolivianos. */
export const formatBs = (amount: number): string =>
  `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
