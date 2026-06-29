/**
 * Karman design tokens — the single typed source of truth for brand identity
 * and visual primitives. Components consume these tokens (or the CSS custom
 * properties derived from them in `globals.css`); raw hex values must never be
 * hard-coded inside components.
 *
 * Requirements: 10.1, 10.2
 */
export const tokens = {
  color: {
    primaryNavy: "#071E41",
    secondaryNavy: "#0B2A5B",
    goldAccent: "#D6A21E",
    iceBackground: "#F8FAFC",
    textDark: "#111827",
    softCyan: "#22B8CF",
    success: "#0F766E",
    warning: "#F59E0B",
    danger: "#DC2626",
  },
  status: {
    ok: "#0F766E",
    warn: "#F59E0B",
    error: "#DC2626",
    info: "#22B8CF",
  },
  surface: {
    base: "#F8FAFC",
    panel: "rgba(255,255,255,0.72)",
    panelStrong: "rgba(255,255,255,0.85)",
  },
  glass: {
    blur: "16px",
    border: "1px solid rgba(255,255,255,0.35)",
    shadow: "0 8px 32px rgba(7,30,65,0.12)",
  },
  border: {
    subtle: "rgba(17,24,39,0.08)",
    strong: "rgba(17,24,39,0.16)",
  },
  shadow: {
    sm: "0 1px 2px rgba(7,30,65,0.06)",
    md: "0 4px 12px rgba(7,30,65,0.10)",
    lg: "0 8px 32px rgba(7,30,65,0.14)",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    pill: "999px",
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "40px",
  },
  z: {
    base: 0,
    header: 100,
    sidebar: 90,
    overlay: 1000,
    modal: 1100,
    toast: 1200,
  },
  focus: {
    ring: "0 0 0 3px rgba(34,184,207,0.45)",
  },
  font: {
    // IRANYekanX variable font (see src/app/fonts.ts); variable weight range 100–900.
    sans: "var(--font-iranyekanx)",
    weights: { regular: 400, medium: 500, bold: 700 },
  },
} as const;

export type Tokens = typeof tokens;
