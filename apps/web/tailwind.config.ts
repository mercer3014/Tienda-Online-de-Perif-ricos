import type { Config } from 'tailwindcss';

/**
 * Identidad visual "Villano Gamer Store": cyberpunk futurista oscuro.
 * Fondo ultra oscuro (negro/grafito), acentos Purpura Neon y Verde Neon.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          black: '#05060a',
          void: '#0a0c14',
          graphite: '#111420',
          panel: '#161a29',
          border: '#232a40',
        },
        neon: {
          purple: '#a855f7',
          'purple-bright': '#c084fc',
          green: '#39ff14',
          'green-soft': '#5cff8f',
        },
        txt: {
          primary: '#e8eaf2',
          muted: '#9aa2bd',
          faint: '#5f6787',
        },
        status: {
          stock: '#39ff14',
          low: '#ffb020',
          out: '#ff3b6b',
        },
      },
      fontFamily: {
        display: ['"Rajdhani"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': '0 0 12px rgba(168,85,247,0.55), 0 0 2px rgba(168,85,247,0.9)',
        'neon-green': '0 0 12px rgba(57,255,20,0.5), 0 0 2px rgba(57,255,20,0.9)',
        panel: '0 8px 30px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'grid-neon':
          'linear-gradient(rgba(168,85,247,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.06) 1px, transparent 1px)',
      },
      clipPath: {},
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
