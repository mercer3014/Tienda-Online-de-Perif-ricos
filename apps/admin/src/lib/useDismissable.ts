import { useEffect } from 'react';

/**
 * Comportamiento estandar de paneles/modales cerrables:
 * - Tecla Escape cierra.
 * - Bloquea el scroll del fondo mientras esta abierto y lo restaura al cerrar.
 * (El click en el backdrop lo maneja cada componente en su overlay.)
 */
export function useDismissable(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [active, onClose]);
}
