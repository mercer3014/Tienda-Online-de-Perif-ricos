import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Revela un elemento (fade + subida, ver .reveal/.reveal-in en index.css)
 * la primera vez que entra en pantalla al hacer scroll. `delayMs` permite
 * escalonar una grilla (cada item un poco despues que el anterior) sin
 * animar todos a la vez.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(delayMs = 0) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Red de seguridad: si el IntersectionObserver nunca llega a disparar
    // (contexto raro, extension que lo bloquea, etc.) el contenido no debe
    // quedar invisible para siempre - despues de un rato se revela igual.
    const fallback = setTimeout(() => setInView(true), 2500);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          clearTimeout(fallback);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return {
    ref,
    className: inView ? 'reveal reveal-in' : 'reveal',
    style: { '--reveal-delay': `${delayMs}ms` } as CSSProperties,
  };
}
