import { useEffect, useRef, useState } from 'react';

/** Anima un numero contando desde el valor anterior hasta `target` (ease-out,
 * ~600ms). Si el usuario prefiere menos movimiento, salta directo al valor. */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    // Red de seguridad: si por lo que sea rAF no llega a completar la cuenta
    // (pestaña en background, etc.), el numero no debe quedar trabado a mitad
    // de camino para siempre.
    const fallback = setTimeout(() => setValue(target), durationMs + 200);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
