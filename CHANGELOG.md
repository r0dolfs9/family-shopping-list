# CHANGELOG

## 2.0.0 — full redesign and repair (2026-06-12)

### Honest sync
- New sync engine: every change is saved on the device first, queued in a
  persistent outbox, and pushed to the family database in order. Reload-safe.
- The sync pill now reports real states (synced / syncing / offline / error /
  local-only) — it never claims "synced" before the database confirms.
- Failed changes are marked on the item ("nav nosūtīts") with one-tap retry.
- Real-time updates reconnect automatically and refetch anything missed.

### Secure family model
- Devices sign in anonymously; a family is created once and other phones join
  with a 6-character invite code (Settings shows it).
- Row Level Security isolates families. No personal IDs in the source code.

### Truthful prices
- Prices are never invented. An item has a price only if someone typed one, or
  the family priced the same product before (shown as `~estimate` with its age).
- Totals show "N bez cenas" instead of pretending unpriced items cost €1.50.
- Old fabricated V1 estimates are dropped during migration; human-entered
  prices are kept.

### UX
- New mobile-first interface: one-hand check-off (44px+ targets), quick add bar,
  progressive details sheet, undo snackbars for delete and check-off,
  duplicate-name prompt, light/dark/auto theme, safe-area and reduced-motion
  support, correct Latvian diacritics throughout.
- Installable PWA: opens offline, app shell cached.

### Data safety
- V1 localStorage data migrates automatically and non-destructively.
- Corrupt data is backed up, never wiped. Migration SQL provided for the V1
  database.
