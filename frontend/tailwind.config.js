/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050b1f',
          900: '#0a1433',
          800: '#101d48'
        },
        skyaccent: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7'
        }
      },
      boxShadow: {
        panel: '0 10px 35px rgba(5, 11, 31, 0.45)'
      }
    }
  },
  plugins: []
};
