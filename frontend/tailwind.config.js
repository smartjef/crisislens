/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        DEFAULT: '2px',
        sm: '1px',
        md: '2px',
        lg: '4px',
        xl: '8px',
      },
      boxShadow: {
        none: 'none',
        card: '0 1px 2px rgba(0, 0, 0, 0.1)',
      },
      colors: {
        flood: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2', // PRIMARY — buttons, active states, links
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        danger:  { DEFAULT: '#ef4444', dark: '#dc2626' },
        warning: { DEFAULT: '#f59e0b', dark: '#d97706' },
        success: { DEFAULT: '#10b981', dark: '#059669' },
        surface: {
          DEFAULT: '#0f172a', // page bg (dark mode)
          raised:  '#1e293b', // card bg (dark mode)
          border:  '#334155', // dividers (dark mode)
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        cond: ['"IBM Plex Sans Condensed"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
