import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0B0F1A',
        'bg-surface': '#111827',
        'bg-elevated': '#1A2235',
        'bg-input': '#151E2D',
        'border-app': '#1F2D42',

        saffron: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },

        navy: {
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E3A5F',
          900: '#1E2D45',
        },
      },

      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        hindi: ['Noto Sans Devanagari', 'sans-serif'],
      },

      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },

      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'float': 'float 4s ease-in-out infinite',
        'float-delayed': 'float 4s ease-in-out 0.5s infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'count-up': 'countUp 2s ease-out',
      },

      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(1deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },

      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.5)',
        elevated: '0 4px 24px rgba(0,0,0,0.6)',
        saffron: '0 4px 20px rgba(249,115,22,0.25)',
        danger: '0 4px 20px rgba(239,68,68,0.30)',
      },
    },
  },
  plugins: [],
}

export default config
