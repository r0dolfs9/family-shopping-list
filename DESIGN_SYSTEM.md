# DESIGN_SYSTEM — Tally V2

## Principles
Calm, fast, dependable. One screen, one job: the list. Everything else
(details, settings, setup) is an overlay that never steals the list's state.

## Type
- Display: **Barlow Condensed 600**, uppercase, tight leading — headings, category names, brand.
- Text: **Inter Tight** (variable) — body, items, controls. Base 16px; item names 16.5px/550.
- Mono: **DM Mono** — prices, counts, codes, micro-labels (11–14px, letterspaced uppercase).

## Color tokens (light / dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| --bg | #f7f3ea | #14151a | page |
| --surface | #fffaf1 | #1e2028 | cards, sheet |
| --surface-2 | #efe8db | #2a2d38 | segmented bg |
| --ink | #1b1916 | #f1ede4 | primary text |
| --ink-2 / --ink-3 | #5d584f / #8a8479 | #c2bcb1 / #8b8f9a | secondary / tertiary |
| --accent | #2541e0 | #7e92ff | primary action, focus |
| --ok / --warn / --danger | #3d7a45 / #9a6b1a / #b8443a | #7fbe88 / #d9a84e / #e07a70 | status |

Category hues are fixed small dots (9px) — color identifies, never decorates.

## Spacing & shape
- Radius: 16px cards, 22px sheet top, 999px pills/buttons.
- List row min-height 56px; every tap target ≥44×44.
- Page gutter 14–20px; max content width 560px, centered on desktop.
- Safe areas: `env(safe-area-inset-*)` on top bar and bottom add bar.

## Components & states
- **Sync pill**: dot + label; dot color = state; pulses while syncing (reduced-motion: static).
- **Row**: checkbox (44px) / name+meta / price column. Bought = green check, strikethrough, moved to "Grozā" group at bottom. Pending = "gaida sinhronizāciju" tag; failed = red "nav nosūtīts".
- **Price**: mono. Manual = full ink. Estimate = `~` prefix + age line ("~ pirms 12 d."), dimmer. Stale (>60d) dimmest. None = "—".
- **Add bar**: fixed pill above safe area; text field + details (sliders icon) + accent submit.
- **Sheet**: bottom sheet, grab handle, large name field, category chips (radio), qty/price grid, note; Enter submits; Esc closes; focus returns to invoker.
- **Snackbar**: 6s, single action (Atcelt / Pievienot vēlreiz), bottom-center above add bar.
- **Banner**: error-tinted strip under hero with "Mēģināt vēlreiz" — only when ops have failed.

## Motion
180–220ms ease-out entrances only (sheet, snackbar). All gated behind
`prefers-reduced-motion: no-preference`. No loops except the 1.2s sync pulse.

## Copy rules
Latvian with correct diacritics, sentence case, no exclamation marks.
Estimates always visually marked (`~`); the word "aptuveni" used in helper text.
