/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: { 950: '#0F172A', 900: '#111827' },
        mist: '#F3F4F6',
        muted: '#9CA3AF',
        emerald: { DEFAULT: '#10B981', deep: '#059669' },
        fire: { DEFAULT: '#F59E0B', hot: '#EF4444' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-emerald': '0 0 24px -4px rgba(16,185,129,0.55)',
        'glow-fire': '0 0 24px -4px rgba(245,158,11,0.55)',
        card: '0 8px 32px -8px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
