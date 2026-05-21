import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          dark: '#070e17',
          mid: '#0a1628',
          sidebar: '#0a1628',
          hover: '#152541',
          brand: '#1e3a8a',
          light: '#3b82f6',
        },
        gold: {
          brand: '#f59e0b',
          light: '#fbbf24',
        }
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '20px',
        '3xl': '32px',
        '4xl': '40px',
      }
    },
  },
  plugins: [],
} satisfies Config;
