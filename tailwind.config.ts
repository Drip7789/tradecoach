import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        page: '#ECF0CC',
        surface: '#E4D4AE',
        surface2: '#D9D99C',
        borderSoft: '#B3978D',
        textMain: '#2E3A35',
        textMuted: '#5D6D65',
        accent: '#739187',
        accentStrong: '#7FBF87',
        tahuna: '#ECF0CC',
        mild: '#D9D99C',
        limeSoft: '#AFC99B',
        blueSmoke: '#739187',
        ivoryBrown: '#B3978D',
        antiqueIvory: '#D1BE97',
        background: {
          primary: '#ECF0CC',
          secondary: '#D1BE97',
          tertiary: '#D9D99C',
          card: '#D1BE97',
        },
        text: {
          primary: '#2E3A35',
          secondary: '#5D6D65',
          muted: '#7A857F',
        },
        accent: {
          primary: '#739187',
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
