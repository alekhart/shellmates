import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        teal: '#4ecdc4',
        pink: '#ff6b9d',
        dark: {
          bg: '#0a0a0f',
          card: '#12121a',
          border: '#1a1a2e',
          hover: '#252540',
        },
      },
    },
  },
  plugins: [],
};

export default config;
