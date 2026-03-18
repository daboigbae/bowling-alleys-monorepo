// Design tokens for the BAIO mobile app.
// Colors are resolved from mobile/src/constants/colors.js — single source of truth.
// Font families correspond to registered names in mobile/app/_layout.tsx.

const RAW = require('./colors') as Record<string, string>;

export const THEME = {
  fonts: {
    // Brand display — logo, hero headlines (CsGordon, local .otf)
    brand: 'CsGordon',
    // Section headers and UI headings (Montserrat)
    heading: 'Montserrat-Bold',
    headingSemiBold: 'Montserrat-SemiBold',
    headingMedium: 'Montserrat-Medium',
    headingRegular: 'Montserrat-Regular',
    // Body text, labels, form fields (Public Sans)
    body: 'PublicSans-Regular',
    bodyMedium: 'PublicSans-Medium',
    bodySemiBold: 'PublicSans-SemiBold',
    bodyBold: 'PublicSans-Bold',
  },

  colors: {
    // --- Primary (brand red / main CTA) ---
    primary: RAW.primary,
    primaryForeground: RAW.primaryForeground,

    // --- Secondary (muted surface) ---
    secondary: RAW.secondary,
    secondaryForeground: RAW.secondaryForeground,

    // --- Accent (orange) ---
    accent: RAW.accent,
    accentForeground: RAW.accentForeground,

    // --- Backgrounds ---
    background: RAW.background,
    card: RAW.card,

    // --- Muted surface ---
    muted: RAW.muted,
    mutedForeground: RAW.mutedForeground,

    // --- Text ---
    text: RAW.foreground,
    textSecondary: RAW.textSecondary,

    // --- Border / Input ---
    border: RAW.border,

    // --- Semantic ---
    error: RAW.error,
    success: RAW.success,
    warning: RAW.warning,

    // --- UI utilities ---
    placeholder: RAW.placeholder,        // TextInput placeholderTextColor + tab inactive tint
    primaryDisabled: RAW.primaryDisabled, // disabled text on primary-colored buttons
    iconSubtle: RAW.iconSubtle,           // muted illustration icons in empty states
  },

  tabBar: {
    activeTint: RAW.primary,
    inactiveTint: RAW.placeholder,
  },

  // 4pt base grid — Design Standard §1
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
  },

  // Design Standard §5 card conventions
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
} as const;
