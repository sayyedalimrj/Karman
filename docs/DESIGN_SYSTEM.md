# Karman Design System

> Living reference for design tokens, composition rules, RTL conventions, and
> typography. Components consume CSS custom properties / tokens and never raw
> hex values. See `src/design/tokens.ts` and `src/app/globals.css`.

## Typography

Karman's primary UI typeface is the **IRANYekanX Variable Font**.

- **Format / source:** A single variable `.woff2` is vendored at
  `src/assets/fonts/iranyekanx/IRANYekanXVF.woff2` and wired through
  `next/font/local` in `src/app/fonts.ts`, exposed as the CSS variable
  `--font-iranyekanx`.
- **Weight axis:** The `wght` axis spans the full variable range **100–900**.
  Weight utilities are available in `globals.css`:
  - `.font-weight-regular` → `wght` 400
  - `.font-weight-medium` → `wght` 500
  - `.font-weight-semibold` → `wght` 600
  - `.font-weight-bold` → `wght` 700
- **`dots` axis:** Subtle and **opt-in only** (headings / brand moments). Never
  apply extreme `dots` globally. Utilities: `.font-dots-normal` (`dots` 0) and
  `.font-dots-sharp` (`dots` 2).
- **Digit stylistic sets:**
  - `.persian-digits` → `ss02` = Persian-style digits.
  - `.tabular-digits` → `ss03` = monospace / tabular digits. Use tabular digits
    for tables, amounts, payment certificates, financial summaries, and numeric
    dashboard cards so figures align on the decimal column.
- **Fallback chain:** While the variable font loads (`display: "swap"`), the
  documented fallback chain is **Tahoma → Arial → sans-serif**. The design token
  `font.sans` resolves to `var(--font-iranyekanx)` with this chain appended.

### Licensing

IRANYekanX is a **licensed commercial font**. The vendored `.woff2` is for use
within this private Karman project only and **MUST NOT be redistributed** outside
of it unless explicitly permitted by the owner. Do not commit it to public
repositories or share it as a standalone asset.
