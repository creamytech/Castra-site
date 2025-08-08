/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        indigo: '#2E2A47',
        gold: '#D4AF37',
        soft: '#FAFAFA',
        slate: '#6B7280',
        teal: '#2CA6A4',
      },
      boxShadow: {
        glow: '0 0 60px rgba(212,175,55,0.18)'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif']
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}