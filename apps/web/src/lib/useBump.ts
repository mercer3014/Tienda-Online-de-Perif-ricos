import { useEffect, useRef, useState } from 'react';

/** true por un instante cuando `value` aumenta, para disparar la animacion
 * de rebote .cart-bump (ver index.css) en quien lo consuma. */
export function useBump(value: number): boolean {
  const [bumping, setBumping] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (value > prev.current) {
      setBumping(true);
      const t = setTimeout(() => setBumping(false), 450);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  return bumping;
}
