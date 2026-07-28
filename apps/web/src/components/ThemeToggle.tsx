import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative inline-flex items-center justify-center gap-1.5 rounded-md border border-base-border bg-base-panel/90 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-txt-primary hover:border-neon-purple transition-all duration-200 shadow-sm ${className}`}
      aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      title={`Modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="h-4 w-4 text-neon-green" />
          <span className="hidden sm:inline">Modo claro</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-neon-purple-bright" />
          <span className="hidden sm:inline">Modo oscuro</span>
        </>
      )}
    </button>
  );
}
