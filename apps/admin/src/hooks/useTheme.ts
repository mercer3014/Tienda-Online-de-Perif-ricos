import { useLayoutEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('villano_admin_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light';
  });

  // useLayoutEffect (no useEffect): debe aplicar la clase de forma sincronica
  // dentro del mismo flushSync que dispara ThemeToggle, para que la captura
  // "after" de la View Transition (animacion de gota de agua) sea correcta.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'light') {
      root.classList.add('light');
      body.classList.add('light');
    } else {
      root.classList.remove('light');
      body.classList.remove('light');
    }
    localStorage.setItem('villano_admin_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme };
}
