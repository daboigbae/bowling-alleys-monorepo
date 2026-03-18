// Design tokens for the BAIO mobile app.
// Colors are resolved from frontend/app/globals.css (light mode CSS variables).
// Font families correspond to registered names in mobile/app/_layout.tsx.

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
    // #d42330
    primary: '#d42330',
    // hsl(210 40% 98%)
    primaryForeground: '#F8FAFC',

    // --- Secondary (muted surface) ---
    // hsl(265 15% 96%)
    secondary: '#F4F3F6',
    // hsl(270 15% 13%)
    secondaryForeground: '#211C26',

    // --- Accent (orange) ---
    // hsl(24.6 95% 53.1%)
    accent: '#F97316',
    // hsl(60 9.1% 97.8%)
    accentForeground: '#F9F9F4',

    // --- Backgrounds ---
    // hsl(40 28% 87%) — warm beige, mirrors web body background
    background: '#E7E1D4',
    // hsl(0 0% 100%) — white card surfaces
    card: '#FFFFFF',

    // --- Muted surface ---
    // hsl(265 15% 96%)
    muted: '#F4F3F6',
    // hsl(265 6% 43%)
    mutedForeground: '#6D6774',

    // --- Text ---
    // hsl(270 15% 13%) — dark purple-gray
    text: '#211C26',
    // hsl(265 6% 43%) — medium gray
    textSecondary: '#6D6774',

    // --- Border / Input ---
    // hsl(265 10% 72%)
    border: '#B6B0BE',

    // --- Semantic ---
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  },

  tabBar: {
    activeTint: '#d42330',
    inactiveTint: '#94A3B8',
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
