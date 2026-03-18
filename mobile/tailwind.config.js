/** @type {import('tailwindcss').Config} */
const colors = require('./src/constants/colors');

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: colors.primary, foreground: colors.primaryForeground },
        secondary: { DEFAULT: colors.secondary, foreground: colors.secondaryForeground },
        accent: { DEFAULT: colors.accent, foreground: colors.accentForeground },
        background: colors.background,
        card: { DEFAULT: colors.card, foreground: colors.foreground },
        muted: { DEFAULT: colors.muted, foreground: colors.mutedForeground },
        foreground: colors.foreground,
        border: colors.border,
        shimmer: colors.shimmer,
        destructive: colors.error,
        success: colors.success,
        warning: colors.warning,
      },
    },
  },
  plugins: [],
};
