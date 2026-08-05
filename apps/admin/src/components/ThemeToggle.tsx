import { flushSync } from 'react-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  // Efecto "gota de agua": el nuevo tema se revela en un circulo que crece
  // desde el punto donde se hizo click, usando la View Transitions API.
  // Si el navegador no la soporta (o el usuario prefiere menos movimiento),
  // cae de vuelta al cambio instantaneo de siempre.
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !document.startViewTransition) {
      toggleTheme();
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => {
      flushSync(() => toggleTheme());
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
          { duration: 350, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
        );
      })
      // El navegador puede abortar la transicion (ej. clicks muy seguidos); el
      // tema ya cambio via flushSync arriba, asi que solo se pierde el efecto
      // visual. Sin este catch, la promesa rechazada queda sin manejar.
      .catch(() => {});
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`relative inline-flex items-center justify-center gap-1.5 rounded-md border border-base-border bg-base-panel/90 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-txt-primary hover:border-neon-purple transition-all duration-200 shadow-sm ${className}`}
      aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      title={`Modo ${theme === 'dark' ? 'Claro' : 'Oscuro'}`}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="h-4 w-4 text-neon-green" />
          <span className="hidden sm:inline">Modo Claro</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-neon-purple-bright" />
          <span className="hidden sm:inline">Modo Oscuro</span>
        </>
      )}
    </button>
  );
}
