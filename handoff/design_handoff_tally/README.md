# Handoff: Tally — Family Shared Shopping List

A premium, mobile-first shared shopping list for families. Items sync in real time across
every member's phone, auto-group by category, and each carries name · quantity · price
estimate · note plus attribution (who added/checked it). UI language is **Latvian**.

This package contains a **working HTML/React prototype** (high-fidelity) plus a complete
**backend implementation guide** (`BACKEND.md`) for shipping the real app on Supabase.

---

## About the design files

The files in this bundle are **design references built in HTML + React (Babel in-browser)**.
They demonstrate the intended look, copy, and behavior — they are **not** the production
codebase. Your job is to **recreate these screens in the target environment** (recommended:
**Next.js** for web/PWA or **Expo / React Native** for native) using its own conventions,
then wire them to a real realtime backend per `BACKEND.md`. If there is no codebase yet,
pick the framework that best fits the team and implement there.

The prototype's component boundaries already map cleanly to production (see "Prototype →
production mapping" below), so you can lift structure and exact visual values directly.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, radii, and interactions are all
intended as-shipped. Recreate the UI pixel-faithfully using the codebase's libraries.
The one approximation is the **price estimator** (a local keyword table) — see `BACKEND.md`
for the production options.

---

## Screens / views

### 1. Shopping list (home) — `app/App.jsx`
- **Purpose:** see everything to buy, grouped by category; add/check/delete fast.
- **Layout (top → bottom):**
  - **Header** (`.t-header`, padding `56px 20px 14px`): top row = overlapping avatar stack
    (`.t-avstack`, left, opens Family sheet) + right cluster of a "Sinhronizēts" live pill
    (`.t-sync`, green pulsing dot) and a gear button (`.t-iconbtn`, opens Settings).
    Below: eyebrow = family name (DM Mono 11px, uppercase, letter-spacing .14em, `--ink3`);
    title "Iepirkumu saraksts" (Barlow Condensed 600, **46px**, line-height .96,
    letter-spacing -.02em); summary line "N preces · vēl ~X €" (13px; the € amount in DM Mono).
  - **List** (`.t-list`, flex:1, scroll, padding `0 20`): one **section** per category in fixed
    category order. Section header = colored 8px dot (category hue) + name (15? actually 13px/600)
    + count (DM Mono 11px `--ink3`) + hairline rule + section price total (DM Mono 11px).
    Rows live in a rounded card (`.t-rows`, `--surface`, 1px `--line`, radius **18px**), each
    row separated by a 1px `--line2` hairline.
  - **Bought items** collapse into a final "Grozā" (In cart) section, dimmed, strikethrough.
  - **Add bar** (`.t-addbar`, fixed bottom, padding `12 16 28`): a tappable field
    "Pievienot sarakstam…" (`.t-addfield`, 52px, radius 16, `--surface2`) + a square accent
    **+** button (`.t-addbtn`, 52×52, radius 16, accent bg, soft accent glow).
- **Row anatomy** (`.t-row-body`, padding `15px`(airy)/`9px`(compact) × `16px`):
  - *Checkbox style:* leading circle (`.t-check`, 24px, 2px `--ink4`; when on, fills with
    accent + white check).
  - Name (`.t-name`, Inter Tight 16px/500; bought → line-through `--ink3`).
  - Meta line: quantity chip (`.t-qty`, DM Mono 11px on `--surface2`, radius 5) · note (12px
    `--ink3`); if empty, shows "pievienots pirms X min" / "grozā".
  - Right cluster: price (`.t-price`, DM Mono 13px/500). **Estimated** prices render muted
    with a leading "≈ " and `.guess` class. Then the adder/checker avatar (22px).

### 2. Add / Edit item sheet — `app/sheets.jsx` (`AddEditSheet`)
- Bottom sheet (`.t-sheet`, radius 28px top, slide-up `.34s cubic-bezier(.22,1,.36,1)`),
  scrim `rgba(8,10,16,.34)` + 2px blur.
- Big name input (`.t-input-lg`, Inter Tight 26px/500, bottom hairline). Placeholder "Ko vajag?".
- Horizontal **category chips** (`.t-cat-chip`, pill, scrolls). Selected chip border+text take the
  category hue. Category **auto-guesses** from the name as you type (until manually changed).
- Row of **Daudzums** (text) + **Cena** (decimal; € suffix). Empty price shows placeholder
  "≈ <estimate>". A hint line (`.t-price-hint`) explains the auto-estimate.
- **Piezīme** (note) input.
- Actions: when editing, a ghost **Dzēst** (danger) + primary **Saglabāt**; when adding, primary
  **Pievienot** (accent, disabled until a name exists).

### 3. Family / invite sheet — `app/sheets.jsx` (`InviteSheet`)
- Label "Tava ģimene". **Editable family name** (`.t-family-name-btn` → tap → `.t-family-input`
  with accent underline; Enter saves, Esc cancels, persists to `localStorage`).
- Invite card: QR placeholder + invite **code** (DM Mono 22px, letter-spacing .1em) + "Kopēt
  ielūguma saiti" (copies `tally.app/join/<code>`, confirms "Saite nokopēta").
- Member list: avatar + name (owner tagged "tu") + role (Īpašnieks/Dalībnieks) + "tiešsaistē".

### 4. Settings — `app/sheets.jsx` (`SettingsScreen`)
- Full-screen push-over (`.t-screen`, slide-in X). Groups: **Izskats** (Tēma Gaišs/Tumšs,
  Blīvums Plašs/Kompakts, Saraksta stils Vilkšana/Ķeksis, Akcents swatches), **Ģimene**
  (name → opens Family sheet, invite link), **Par** (version). Segmented controls = `.t-seg`.

---

## Interactions & behavior

- **Add:** tap add field or + → sheet → fill → save. New item prepends, animates in (`arrive`
  keyframe: brief accent-tint fade, 1.2s).
- **Check off:** *Checkbox style* — tap the circle. *Swipe style* (default) — drag a
  `.t-swipe-surface` right past **72px** to check (green reveal), left past 72px to delete
  (red reveal); release < 72px snaps back. Pointer events; momentum via
  `transform .26s cubic-bezier(.22,1,.36,1)`.
- **Edit:** tap a row body → Add/Edit sheet pre-filled.
- **Delete:** swipe-left, or **Dzēst** in the edit sheet.
- **Category auto-guess:** keyword → category (Latvian stems) in `app/data.jsx` `guessCategory`.
- **Price auto-estimate:** empty price on save → `guessPrice(name, cat)` (keyword table, else
  category average); flagged `priceGuessed` and shown with "≈". *Replace with real prices in prod.*
- **Realtime (simulated):** every 26–42s a scripted "family member" adds or checks an item
  with a subtle toast (`.t-toast`, glass, slide-up, auto-dismiss ~3.6s). In production this is a
  Supabase Realtime subscription (see `BACKEND.md`).
- **Theme:** light/dark via CSS-variable swap on `.t-app(.dark)`; device status bar flips too.

## State management

| State | Shape | Persistence (prototype) |
|---|---|---|
| `items` | `[{ id, name, qty, price, priceGuessed, note, cat, bought, by, at, checkedBy, checkedAt }]` | `localStorage["tally.items.v2"]` |
| `family` | `{ name, code }` | `localStorage["tally.family.v1"]` |
| tweaks | `{ accent, dark, density, listStyle }` | tweaks host / defaults block |
| UI | `addOpen, draft, invite, settings, toast, arrived` | in-memory |

Operations in `app/App.jsx`: `upsert(item)` (insert or update; applies price guess),
`toggle(item)` (bought↔active with checker/time), `remove(item)`. In production these become
Supabase writes; the realtime subscription replaces local `setItems`.

---

## Design tokens

**Type:** Inter Tight (UI/body/headings, 100–900) · Barlow Condensed (display numerics &
titles, 600) · DM Mono (labels, quantities, prices, codes). Self-hosted (SIL OFL) in `fonts/`.

**Color — light:** bg `#FAFAF8` · surface `#FFFFFF` · surface2 `#F3F3F1` · ink `#0B0E14` ·
ink2 `#3A3F4A` · ink3 `#7A808C` · ink4 `#C2C6CE` · line `#E9E9EC` · line2 `#F1F1F3` ·
win `#197A4F` · danger `#C0524E` · green `#2FAE66`.

**Color — dark:** bg `#0A0B0D` · surface `#15171B` · surface2 `#1C1F25` · ink `#F3F4F6` ·
ink2 `#AEB3BD` · ink3 `#727781` · ink4 `#454A53` · line `#24272D` · line2 `#1B1E23` ·
win `#46C98A` · danger `#E0635E`.

**Accent:** default `#2541E0` (options `#197A4F`, `#C0524E`, `#7A5AE0`, `#0B0E14`).

**Category hues:** produce `#3E8E5A` · fruit `#D98A2B` · meat `#C0524E` · dairy `#3E6FB0` ·
bakery `#A9772F` · drinks `#2E8C8C` · snacks `#8A5BC4` · frozen `#4A86C4` ·
household `#5E6470` · other `#8A8F99`.

**Radii:** rows/cards 18 · inputs 12 · buttons 14 · sheet 28 (top) · addfield/addbtn 16 ·
chips 999 · avatar 50%.

**Key sizes:** title 46 · item name 16 · meta/note 12 · qty/price (DM Mono) 11/13 ·
eyebrow 11 (uppercase, ls .14em) · row height ≈ 56 (airy) / 44 (compact) · checkbox 24 ·
avatar 22 (row) / 30 (header) / 34 (member list) · tap targets ≥ 44.

**Motion:** sheets `.34s cubic-bezier(.22,1,.36,1)` · swipe snap `.26s` same curve ·
toast slide-up `.4s` · live dot pulse 2.4s.

## Assets
- Fonts: `fonts/InterTight-VF.ttf`, `BarlowCondensed-{Regular,Medium,SemiBold,Bold}.ttf`,
  `DMMono-{Regular,Medium}.ttf` (declared in `fonts.css`). All SIL OFL.
- Icons: inline monoline SVG set (`TIcon` in `app/data.jsx`) — reuse or swap for the codebase's
  icon library at the same 1.75px stroke weight.
- No raster images; the QR is a placeholder glyph (generate a real QR in prod).

## Files in this bundle
```
Tally — Family Shopping List.html   # entry: all theme CSS + script imports
app/data.jsx        # categories, members, seed, category/price guess, icons
app/components.jsx  # Avatar, ItemRow (both styles + swipe), SectionHeader, Toast, EmptyState
app/sheets.jsx      # AddEditSheet, InviteSheet (editable name), SettingsScreen
app/App.jsx         # state, simulated realtime, list assembly, tweaks
fonts/  fonts.css   # self-hosted brand fonts
ios-frame.jsx       # device frame used only for presentation (drop in prod)
tweaks-panel.jsx    # design-time variation panel (drop in prod)
BACKEND.md          # Supabase schema, RLS, realtime, auth, invite flow
PLAN.md  PROGRESS.md README.md   # project planning + run notes
```

---

## Prototype → production mapping
| Prototype | Production |
|---|---|
| `localStorage["tally.items.v2"]` + `setItems` | Supabase `items` table + Realtime subscription |
| `upsert / toggle / remove` in `App.jsx` | Supabase `insert / update / delete` (optimistic) |
| `REMOTE_SCRIPT` simulated events | live `postgres_changes` events from other clients |
| `family { name, code }` in state | `families` row; `code` = `invite_code` |
| `MEMBERS` constant | `members` table scoped to `family_id` |
| `guessPrice` keyword table | keep as fallback; add real price source (see `BACKEND.md`) |
| iOS frame + tweaks panel | remove — presentation-only scaffolding |

See **`BACKEND.md`** for the database schema (SQL), Row-Level Security, realtime subscription
code, auth (magic-link), and the invite/join flow.
