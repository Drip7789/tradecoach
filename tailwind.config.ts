import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#0a0f1a',
          secondary: '#1E293B',
          tertiary: '#334155',
          card: '#1E293B',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        accent: {
          primary: '#6366F1',
        },
        pnl: {
          profit: '#10B981',
          loss: '#EF4444',
        },
        severity: {
          low: '#10B981',
          medium: '#F59E0B',
          high: '#EF4444',
          critical: '#DC2626',
        },
      },
    },
  },
  plugins: [],
};

export default config;
