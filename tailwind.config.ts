import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        profit: {
          DEFAULT: '#22c55e',
          light: '#dcfce7',
        },
        loss: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
        },
        neutral: {
          DEFAULT: '#6b7280',
          light: '#f3f4f6',
        },
      },
    },
  },
  plugins: [],
};
export default config;
