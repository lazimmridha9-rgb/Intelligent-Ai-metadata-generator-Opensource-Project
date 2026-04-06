/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/index.html',
    './src/js/**/*.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif']
      },
      colors: {
        primary: '#60a5fa',
        secondary: '#94a3b8',
        accent: '#a78bfa',
        dark: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          950: '#020617'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: []
};
