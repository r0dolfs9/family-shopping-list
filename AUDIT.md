# AUDIT — family-shopping-list (main @ 6419891)

Severity: 🔴 critical · 🟠 major · 🟡 minor

## Sync & security

1. 🔴 **Sync indicator lies.** `app.js` sets `syncStatus='online'` after `load()` succeeds — but with no auth session, RLS makes `select` return an **empty array, not an error** (`my_family_ids()` is empty for anon). App shows "Sinhronizets" with an empty DB list, then silently swaps the user's local list away. Root cause: success of a query is treated as proof of working sync; there is no auth at all in the client while the schema requires `auth.uid()`.
2. 🔴 **Writes can never succeed.** Every `upsert` violates `items_all` RLS (no session ⇒ `my_family_ids()` empty). Optimistic UI keeps the item on screen; the throw flips status to "Sync kluda" but the phantom item stays until reload. Root cause: client identity model (hard-coded `familyId`/`memberId` in `app-config.js`) conflicts with the auth-based RLS model.
3. 🔴 **Optimistic updates without rollback** for add/update/toggle (only delete rolls back). Failed writes leave permanently-unsynced items that look saved.
4. 🟠 **Hard-coded family + member UUIDs and project credentials in source.** Anon key is public-by-design, but family/member IDs are personal data baked into reusable code; no join/create-family flow exists.
5. 🟠 **No Realtime lifecycle handling**: no channel status callback, no reconnect/refetch after disconnect, no dedupe of echoed own-writes, `dispose()` never called.
6. 🟠 **No offline support whatsoever.** No service worker, no op queue, no retry; on GitHub Pages with weak reception the app doesn't even load. `runStoreAction` also resets status to `'online'` after any success — even when the success was a local fallback store.

## Data integrity

7. 🔴 **Fabricated prices.** `estimatePrice()` returns hard-coded 2024-era guesses from a 10-entry list and **€1.50 for anything unknown**. Every item without a manual price gets an invented price; totals sum these as if real. `rowToItem` converts NULL price to `0` ⇒ "0.00 €" rendered as fact.
8. 🟠 **Delete is one tap, no confirm, no undo** ("×" button at thumb edge). Accidental irreversible loss.
9. 🟠 **Corrupt localStorage ⇒ data wiped and replaced with demo seed items** (`readState` catch removes the key, then seeds). Recovery should preserve the raw blob.
10. 🟡 **Duplicate names silently coexist** with no UX explanation; double-tap of "Pievienot" creates duplicates (no submit guard, listeners survive until re-render).

## UI / rendering

11. 🟠 **Full `innerHTML` re-render on every state change.** Any Realtime event while the sheet is open destroys the form and loses typed input. Focus lost on every render; `aria-live="polite"` on the whole app makes screen readers announce the entire list each render.
12. 🟠 **Latvian copy lacks diacritics**: "Gimene"→"Ģimene", "Atvert"→"Atvērt", "kluda"→"kļūda", "Sinhronizets"→"Sinhronizēts", "Groza"→"Grozā", "Naski"→"Našķi", "Gala"→"Gaļa", "Darzeni"→"Dārzeņi", "Saldets"→"Saldēts", "Majai"→"Mājai", "tukss"→"tukšs", etc. Throughout core.js, app.js.
13. 🟡 Settings is a fake screen: members list is hard-coded ("gatavs testam"), avatar-stack button opens settings, ⚙ is a text glyph, no safe-area insets, fonts loaded from `../handoff/` path (fragile), no `prefers-reduced-motion` handling, delete/check targets < 44px.
14. 🟡 `index.html` `theme-color` fixed to light; no manifest/icons; dark mode flashes light on load.

## Tests

15. 🟡 Tests cover pure logic only (and lock in the fabricated-price behaviour as *correct*). No DOM, no failure paths, no Supabase store, no offline.

## What's good (keep)

- Clean module split (core / stores / mappers), escapeHtml discipline, category model, schema's `touch_updated_at` trigger and `my_family_ids()` SECURITY DEFINER pattern, NFD-normalized Latvian matching.

## V2 resolutions (implemented)

| # | Resolution |
|---|---|
| 1,2,4 | Anonymous Supabase auth + invite-code `join_family`/`create_family` SECURITY DEFINER RPCs; no IDs in source; config = url+anon key only |
| 3,6 | Persistent op-queue: every write goes to the queue first, UI marks rows pending/failed, retry on reconnect with backoff |
| 5 | Channel status handling, refetch-on-resubscribe, idempotent event application keyed by `updated_at` |
| 7 | Price provenance model: `manual` / `recent` (family history ≤60d) / `historical` (labelled, >60d) / none. No invented values; totals say "n bez cenas" |
| 8 | Delete & check-off get 6s undo snackbar; no blocking confirm |
| 9 | Corrupt blob renamed to `…-corrupt-<ts>` backup key, never deleted |
| 10 | Submit-in-flight guard; duplicate active name prompts "jau sarakstā — pievienot vēlreiz?" |
| 11 | Targeted DOM updates (keyed row reconciliation); sheet is never re-rendered by external events |
| 12 | All copy rewritten in correct Latvian |
| 13,14 | Real settings (family, members, invite code, theme auto/light/dark), safe-area insets, ≥44px targets, reduced-motion, manifest + SW |
