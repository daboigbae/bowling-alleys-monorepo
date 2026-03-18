/**
 * BAIO color palette — single source of truth.
 *
 * All hex values in this file are the authoritative brand colors.
 * Change a color here and it propagates to:
 *   1. Tailwind/NativeWind utility classes (via tailwind.config.js)
 *   2. Runtime values in theme.ts (ActivityIndicator, tintColor, inline styles)
 *
 * CommonJS format required — tailwind.config.js uses module.exports (Rule: no ESM in config).
 */
module.exports = {
  // ── Brand / CTA ───────────────────────────────────────────────────────────
  primary: '#d42330',
  primaryForeground: '#F8FAFC',

  // ── Secondary surface ─────────────────────────────────────────────────────
  secondary: '#F4F3F6',
  secondaryForeground: '#211C26',

  // ── Accent (orange) ───────────────────────────────────────────────────────
  accent: '#F97316',
  accentForeground: '#F9F9F4',

  // ── Backgrounds ───────────────────────────────────────────────────────────
  background: '#E7E1D4',   // warm beige — app-level background
  card: '#FFFFFF',          // white card / screen surface

  // ── Muted surfaces ────────────────────────────────────────────────────────
  muted: '#F4F3F6',
  mutedForeground: '#6D6774',

  // ── Text ──────────────────────────────────────────────────────────────────
  foreground: '#211C26',     // primary text (headings, body)
  textSecondary: '#6D6774',  // secondary labels (alias of mutedForeground)

  // ── Border / Input ────────────────────────────────────────────────────────
  border: '#B6B0BE',

  // ── Skeleton / loading placeholder ───────────────────────────────────────
  shimmer: '#E2E8F0',        // loading skeleton Views ONLY — not interactive surfaces

  // ── Semantic states ───────────────────────────────────────────────────────
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',

  // ── UI utilities ──────────────────────────────────────────────────────────
  placeholder: '#94A3B8',    // TextInput placeholderTextColor + tab inactive tint
  primaryDisabled: '#f4a0a7', // disabled text on primary-colored buttons
  iconSubtle: '#CBD5E1',     // muted illustration icons in empty states
};
