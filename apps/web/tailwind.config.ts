import type { Config } from 'tailwindcss';

function rgbVar(name: string) {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${name}) / ${opacityValue})`;
    }
    return `rgb(var(${name}))`;
  };
}

/**
 * Identidad visual "Villano Gamer Store": cyberpunk futurista con soporte de tema claro/oscuro.
 * Todos los colores leen de design tokens (variables CSS en index.css).
 */
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          black: rgbVar('--color-base-black'),
          void: rgbVar('--color-base-void'),
          graphite: rgbVar('--color-base-graphite'),
          panel: rgbVar('--color-base-panel'),
          border: rgbVar('--color-base-border'),
        },
        neon: {
          purple: rgbVar('--color-neon-purple'),
          'purple-bright': rgbVar('--color-neon-purple-bright'),
          green: rgbVar('--color-neon-green'),
          'green-soft': rgbVar('--color-neon-green-soft'),
        },
        txt: {
          primary: rgbVar('--color-txt-primary'),
          muted: rgbVar('--color-txt-muted'),
          faint: rgbVar('--color-txt-faint'),
        },
        status: {
          stock: rgbVar('--color-status-stock'),
          low: rgbVar('--color-status-low'),
          out: rgbVar('--color-status-out'),
        },
        accent: {
          DEFAULT: rgbVar('--color-accent-solid'),
          on: rgbVar('--color-on-accent'),
        },
        accent2: {
          DEFAULT: rgbVar('--color-accent2-solid'),
          on: rgbVar('--color-on-accent2'),
        },
        shot: rgbVar('--color-shot-mat'),
      },
      fontFamily: {
        display: ['"Rajdhani"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': 'var(--shadow-neon-purple)',
        'neon-green': 'var(--shadow-neon-green)',
        panel: 'var(--shadow-panel)',
      },
      backgroundImage: {
        'grid-neon':
          'linear-gradient(rgba(168,85,247,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.06) 1px, transparent 1px)',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
