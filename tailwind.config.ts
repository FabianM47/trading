import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'bg-profit-bg',
    'bg-loss-bg',
    'bg-neutral-bg',
    'text-profit',
    'text-loss',
    'text-neutral',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors inspired by modern fintech
        background: {
          DEFAULT: '#0d0d0d',
          card: '#1a1a1a',
          elevated: '#222222',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a0a0',
          tertiary: '#666666',
        },
        profit: {
          DEFAULT: '#00c853',
          light: '#1b5e20',
          dark: '#00e676',
          bg: 'rgba(0, 200, 83, 0.15)',
        },
        loss: {
          DEFAULT: '#ff1744',
          light: '#b71c1c',
          dark: '#ff5252',
          bg: 'rgba(255, 23, 68, 0.15)',
        },
        neutral: {
          DEFAULT: '#a0a0a0',
          bg: 'rgba(160, 160, 160, 0.15)',
        },
        accent: {
          DEFAULT: '#000000',
          hover: '#1a1a1a',
        },
        border: {
          DEFAULT: '#2a2a2a',
          light: '#333333',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
};
export default config;
