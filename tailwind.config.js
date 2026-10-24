/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        black: '#0a0805',
        deep: '#120e09',
        dark: '#1c1510',
        mid: '#2d2318',
        gold: '#c9a84c',
        'gold-lt': '#e8c97a',
        'gold-dk': '#8a6820',
        cream: '#f5ede0',
        warm: '#d4b896',
        text: '#e8ddd0',
        muted: '#9a8a78',
        accent: '#8b3a2a',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        serif: ['"Playfair Display"', 'serif'],
        body: ['"Cormorant Garamond"', 'serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'line-up': 'lineUp 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
        marquee: 'marquee 28s linear infinite',
        'scroll-line': 'scrollLine 2.2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        lineUp: { from: { transform: 'translateY(110%)' }, to: { transform: 'translateY(0)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        scrollLine: {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'top', opacity: '0' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
          '100%': { transform: 'scaleY(0)', transformOrigin: 'bottom', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(201,168,76,0)' },
        },
      },
    },
  },
  plugins: [],
}
