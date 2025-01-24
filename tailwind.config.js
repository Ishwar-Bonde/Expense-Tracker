/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // You can customize your dark mode colors here
        dark: {
          DEFAULT: '#1a1a1a',
          100: '#2d2d2d',
          200: '#404040',
          300: '#525252',
          400: '#656565',
          500: '#787878',
          600: '#8a8a8a',
          700: '#9d9d9d',
          800: '#b0b0b0',
          900: '#c2c2c2',
        },
      },
    },
  },
  plugins: [],
};
