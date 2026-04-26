import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0A0F0A',
          dark: '#142814',
          warm: '#140A0A',
        },
        gold: {
          DEFAULT: '#EEBD2B',
          light: '#F5D060',
          dark: '#C49A1E',
          50: 'rgba(238, 189, 43, 0.05)',
          100: 'rgba(238, 189, 43, 0.1)',
          200: 'rgba(238, 189, 43, 0.2)',
        },
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.03)',
          hover: 'rgba(255, 255, 255, 0.05)',
          active: 'rgba(255, 255, 255, 0.08)',
        },
        border: {
          glass: 'rgba(255, 255, 255, 0.08)',
          light: 'rgba(255, 255, 255, 0.12)',
        },
        text: {
          primary: '#F8F8F8',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        status: {
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
      borderRadius: {
        'card': '12px',
        'input': '8px',
        'pill': '999px',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'slide-in-right': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'pulse-gold': { '0%,100%': { boxShadow: '0 0 0 0 rgba(238,189,43,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(238,189,43,0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'pulse-gold': 'pulse-gold 2s infinite',
      },
    },
  },
  plugins: [],
};
export default config;
