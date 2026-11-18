import colors from 'tailwindcss/colors';

/**
 * PALETTE — see CLAUDE.md §6.
 * `colors` is REPLACED (not extended). Base = ink black, white, warm grays (`neutral` = stone)
 * and the `sand` background family. Red/green/yellow exist only as `status-*` accents,
 * used via src/lib/statusColor.js / StatusBadge.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#14120f', // warm ink
      white: colors.white,
      neutral: colors.stone,
      sand: {
        50: '#fbf8f2',
        100: '#f4ecdf', // page background
        200: '#eadfcc',
        300: '#dccbb0',
        400: '#c7b08c',
      },
      // Bright base = dots, bars, tints. `-ink` = TEXT on light surfaces (≥ 5.6:1 on its tint, WCAG AA).
      // `-glow` = text on black surfaces (≥ 6.7:1). Measured in Phase 8; see CLAUDE.md §6.
      status: {
        ok: colors.emerald[600],
        warn: colors.amber[500],
        bad: colors.red[500],
        'ok-ink': colors.emerald[800],
        'warn-ink': colors.amber[800],
        'bad-ink': colors.red[700],
        'ok-glow': colors.emerald[400],
        'warn-glow': colors.amber[400],
        'bad-glow': colors.red[400],
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(20,18,15,0.04), 0 12px 32px -16px rgba(20,18,15,0.18)',
        lift: '0 2px 0 rgba(20,18,15,0.04), 0 30px 60px -24px rgba(20,18,15,0.35)',
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        rise: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        marquee: 'marquee 45s linear infinite',
        float: 'float 6s ease-in-out infinite',
        rise: 'rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both',
      },
    },
  },
  plugins: [],
};
