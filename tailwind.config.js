/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,ts,tsx}', './components/**/*.{js,ts,tsx}', './src/**/*.{js,ts,tsx}'],
  darkMode: 'class',

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        tq: {
          page: '#f8fafc',
          surface: '#ffffff',
          primary: '#004f4c',
          primarySoft: '#eefafa',
          primaryPressed: '#003f3c',
          teal: '#006c67',
          tealBright: '#42d8e7',
          mint: '#d9fbf7',
          green: '#23d16e',
          navy: '#020a68',
          ink: '#0f172a',
          body: '#334155',
          muted: '#64748b',
          line: '#dbe6ee',
          warning: '#ee845e',
        },
      },
      spacing: {
        'page-x': '16px',
        'page-y': '16px',
        'bottom-nav': '120px',
        'flow-bottom': '120px',
      },
      borderRadius: {
        'tq-card': '14px',
        'tq-panel': '22px',
      },
      boxShadow: {
        tq: '0 12px 24px rgba(15, 23, 42, 0.08)',
        'tq-nav': '0 14px 22px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};
