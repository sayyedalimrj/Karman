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


## Design tokens

The single typed source of truth is `src/design/tokens.ts`. Tokens are surfaced
as CSS custom properties in `src/app/globals.css` (the `:root` block).
**Components consume tokens / CSS variables and never hard-code raw hex.** A
guard test (`src/components/no-raw-hex.test.ts`) enforces this.

Token groups (see `tokens.ts` / the `:root` variables):

| Group | Examples (CSS variable) |
|-------|--------------------------|
| Palette | `--color-primary-navy`, `--color-secondary-navy`, `--color-gold-accent`, `--color-ice-background`, `--color-text-dark`, `--color-soft-cyan`, `--color-success/-warning/-danger` |
| Semantic status | `--status-ok`, `--status-warn`, `--status-error`, `--status-info` |
| Surfaces | `--surface-base`, `--surface-panel`, `--surface-panel-strong` |
| Glass | `--glass-blur`, `--glass-border`, `--glass-shadow` |
| Borders | `--border-subtle`, `--border-strong` |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| Radius | `--radius-sm/-md/-lg/-pill` |
| Spacing | `--space-xs/-sm/-md/-lg/-xl` |
| Z-index | `--z-base/-sidebar/-header/-overlay/-modal/-toast` |
| Focus | `--focus-ring` (applied via `:focus-visible`) |
| Typography | `--font-sans` / `--font-iranyekanx`, `--font-weight-regular/-medium/-bold` |

Translucent tints in component CSS are produced with `color-mix()` over the
semantic/brand variables rather than introducing new hex literals.

## Composition strategy

The aesthetic target is **official, engineering-focused, enterprise-grade,
premium, Persian-first, RTL-first**:

- **Minimalism as the base layer** — clean spacing, restrained color, high
  contrast for trust.
- **Liquid glass** for shells and major panels (`.glass-panel`, the AppShell
  frame, sidebar, top bar) using `backdrop-filter: blur(var(--glass-blur))`.
- **Glass morphism** for dashboard/inbox cards (translucent surface + subtle
  border/shadow; `.card--glass`).
- **Very subtle depth** only on a few elevated controls — never dominant.
- **Forbidden:** random gradients, excessive blur, low-contrast text, mobile-app
  visual noise, and copying the legacy Taksa UI.

## RTL / Persian-first conventions

- The document is RTL by default: `<html dir="rtl" lang="fa">` in
  `src/app/layout.tsx`; `body { direction: rtl; text-align: start; }`.
- Styles use **CSS logical properties** (`margin-inline`, `padding-inline`,
  `inset-inline`, `border-block-end`, `padding-inline-start`, …) so the UI
  mirrors correctly without per-component left/right overrides.
- UI copy is authored in Persian and centralized in `src/lib/i18n`
  (`strings.ts` + `format.ts`) so new locales need no component edits.
- `prefers-reduced-motion` is honored (animations/transitions reduced).

## Implemented components

**Shell** (`src/components/shell`):

- `AppShell` — RTL glass frame composing `Sidebar`, `TopBar`, and a content
  slot; receives only serializable user data; performs no authorization.
- `Sidebar` — renders permission-aware `NavSection`s from `nav.ts`; active item
  highlighting via `activePath`; disabled "coming soon" items rendered honestly.
- `TopBar` + `UserMenu` — section title, current user identity, logout.
- `GlassPanel` — reusable `.glass-panel` surface.

**UI primitives** (`src/components/ui`): `Button` (`.btn` + `--primary` /
`--secondary` / `--ghost` / `--block`), `Card` (`.card`, `.card--glass`),
`Badge` (`.badge` + `neutral`/`ok`/`warn`/`error`/`info` tones). All token-driven.

**States** (`src/components/states`):

- `EmptyState` — product-quality "no data yet" state for genuine empty results;
  never fabricates data.
- `ErrorState` — safe, generic error message; never leaks internal detail.
- `LoadingState` — token-styled spinner with a Persian label.

These states back the dashboard, inbox, and project-setup pages as honest real
states rather than fake content.
