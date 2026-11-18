import colors from 'tailwindcss/colors';

/**
 * STRICT PALETTE — see CLAUDE.md §6.
 * `colors` is REPLACED (not extended): only monochrome + three status accents exist.
 * Status accents may only be used via src/lib/statusColor.js / StatusBadge.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      neutral: colors.neutral,
      status: {
        ok: colors.emerald[500],
        warn: colors.amber[500],
        bad: colors.red[500],
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
