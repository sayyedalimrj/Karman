/**
 * Persian UI font wiring (Requirement 1.3, Task 2.3).
 *
 * Karman's primary UI typeface is the **IRANYekanX Variable Font**, served
 * locally via `next/font/local` from `src/assets/fonts/iranyekanx/*.woff2`.
 *
 * The font exposes a single variable axis covering weights 100–900 plus the
 * optional `dots` axis (consumed via opt-in CSS utilities). It is published
 * under the CSS variable `--font-iranyekanx`; components and the global
 * stylesheet reference only that variable and never the font name directly.
 *
 * LICENSING: IRANYekanX is a licensed commercial font. The vendored `.woff2`
 * file is for use within this private project only and MUST NOT be
 * redistributed outside of it unless explicitly permitted by the owner.
 *
 * The documented CSS fallback chain (Tahoma → Arial → sans-serif) covers the
 * brief window before the variable font loads (`display: "swap"`).
 */
import localFont from "next/font/local";

export const iranYekanX = localFont({
  src: [
    {
      path: "../assets/fonts/iranyekanx/IRANYekanXVF.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-iranyekanx",
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

// Backward-compatible alias: existing modules import `appFont`.
export const appFont = iranYekanX;
