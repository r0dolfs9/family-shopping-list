# Tally — Family Shared Shopping List · PLAN

> Working name: **Tally** (placeholder, easy to rename). A calm, premium, Apple/Tesla-inspired
> shared shopping list for families. Real-time sync across every member's phone.

---

## 1. Project overview

A mobile-first app where every family member runs the same shared list. Anyone can add,
edit, check off, or delete an item and it updates instantly for everyone else. Items are
auto-grouped by category (Meat, Vegetables, Fruit, Dairy, Drinks, Snacks, Household…).
Each item carries a name, optional quantity, optional price estimate, and an optional note,
plus attribution (who added it / who checked it).

The visual language is borrowed from the **HonestCost design system** (Polestar/Tesla
direction): Inter Tight UI, Barlow Condensed display numerics, DM Mono technical labels,
near-black ink on warm off-white, a single indigo accent (`#2541E0`), hairline borders,
generous whitespace. Adapted to mobile with rounded cards and subtle motion.

## 2. Goals

- Feel **premium, minimal, calm** — a serious household utility, not a childish grocery app.
- **Real-time shared state** — the core magic; changes propagate to all members.
- **Practical for daily use** — fast add, one-tap check-off, frictionless.
- **Mobile-first**, light + dark, offline-friendly.
- Ship a believable **MVP prototype** now + a **developer handoff** to build the real backend.

## 3. Features (MVP)

| Feature | Status target |
|---|---|
| Shared list, grouped by category | MVP |
| Add item (name, qty, price est., note, category) | MVP |
| Edit item | MVP |
| Check off / un-check (with who + when) | MVP |
| Delete item (swipe or menu) | MVP |
| Attribution avatars (colored initials) | MVP |
| Real-time sync (simulated in prototype) | MVP |
| Invite / join family flow | MVP |
| Settings (theme, density, members, list style) | MVP |
| Light / dark theme | MVP |
| Offline persistence (localStorage in prototype) | MVP |
| Completed / history view | Post-MVP |
| Multiple named lists | Post-MVP |

## 4. Tech stack

### Prototype (this deliverable)
- **React 18 + Babel standalone** (inline JSX), single-page HTML.
- Self-hosted brand fonts (Inter Tight, Barlow Condensed, DM Mono).
- `localStorage` for persistence; an in-app **simulated sync engine** that mimics a second
  device pushing updates, so the real-time behavior is visible and testable.
- iOS device frame for an honest phone presentation; live **Tweaks** for design variations.

### Recommended production stack (handoff)
- **Next.js (App Router) + React** OR **Expo / React Native** for native phones.
- **Supabase**: Postgres + Row Level Security + **Realtime** (Postgres changes over websockets)
  for sync, **Auth** (magic-link / OTP) for sign-in, **Edge Functions** for invites.
  (Firebase Firestore + Auth is the equivalent alternative.)
- **PWA / offline**: optimistic local writes + a sync queue; Supabase handles conflict-free
  last-write-wins per field, which is sufficient for a shopping list.

### Data model (production)
```
families        (id, name, invite_code, created_at)
members         (id, family_id, display_name, color, avatar_initials, role, created_at)
items           (id, family_id, name, qty, unit, price_estimate, note, category,
                 status['active'|'bought'], added_by, added_at,
                 checked_by, checked_at, sort_index, updated_at)
```
- Realtime subscription scoped to `items` where `family_id = current`.
- RLS: a member may read/write rows only for their own `family_id`.

## 5. Development phases

1. **Foundations** — tokens, theme, fonts, device frame. ✅ design context gathered
2. **State + sync** — data model, localStorage, simulated realtime engine.
3. **Core list** — grouped sections, item rows (two interaction styles), check-off, delete.
4. **Add/edit sheet** — bottom sheet with category, qty, price, note.
5. **Family** — invite/join flow, member avatars, settings.
6. **Polish** — micro-interactions, empty states, dark mode, tweaks.
7. **Handoff** — finalize README + production schema notes.

## 6. Current priorities

Build the interactive MVP prototype end-to-end, then keep PLAN/PROGRESS current.

## 7. Decisions made

- **Auto-grouped by category** (not flat, not multiple lists) per user.
- **Light default**, dark via toggle. Indigo `#2541E0` accent.
- Item fields: **name, quantity, price estimate, note**.
- **Colored-initial avatars** for members.
- Sync demo kept **subtle / realistic** (no gimmicky popups).
- Variations exposed as **Tweaks**: list-item style (check-left vs swipe) and density.
- Prototype simulates realtime; production uses Supabase Realtime.
