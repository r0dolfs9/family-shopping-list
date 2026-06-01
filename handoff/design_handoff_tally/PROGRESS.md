# Tally — PROGRESS

_Living log. Updated at every major step._

## ✅ Completed
- Gathered design context from the HonestCost design system (Polestar/Tesla direction):
  extracted color tokens, type stack, icon set, surface treatments.
- Copied brand fonts (Inter Tight, Barlow Condensed, DM Mono) + `fonts.css` into project.
- Pulled in iOS device frame + Tweaks panel scaffolding.
- Confirmed requirements with the user (theme, accent, grouping, item fields, screens, variations).
- Wrote `PLAN.md`, `README.md`.
- Built the full MVP prototype:
  - Light/dark theme tokens; iOS device frame with auto-scaling stage.
  - Data model + `localStorage` persistence + simulated realtime sync engine (subtle toasts).
  - Core grouped list with both interaction styles (checkbox + swipe), check-off & delete.
  - Add/edit bottom sheet with live category auto-guess, qty, price est., note.
  - Invite/join family sheet (code, link, member presence) + Settings screen.
  - Tweaks: dark mode, density, list-item style, accent, "simulate a family member".

## 🔄 Current task
- Localization to Latvian + defaults (swipe, airy) + empty-price auto-estimate. ✅ shipped.

## 🐞 Bugs / issues
- Browser caches the `.jsx` files; added `?v=N` cache-busting query params on script imports.

## ⏭️ Next steps
1. Optional: real Latvian store prices (scrape Rimi/Maxima/Barbora or a maintained price DB) — v2.
2. Hand off to a developer to implement the Supabase/Firebase realtime backend (see README).

## 📝 Notes
- UI is fully Latvian; price left empty → estimated from a built-in keyword/category table
  (shown with a "≈" marker). Real live store prices are a separate v2 effort.
- Defaults: swipe rows, airy density, light theme, indigo accent.

## 📝 Important notes
- This is a **prototype** of the experience; the real-time backend (Supabase/Firebase) is
  documented in PLAN.md + README.md for a developer to implement.
- Persistence is `localStorage`; clearing site data resets the demo.
- Working app name "Tally" is a placeholder.
