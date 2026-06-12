# README — Tally V2: ģimenes iepirkumu saraksts

A simple shared family shopping list. Static HTML/CSS/JS — runs on GitHub Pages.
Works fully offline on one device; add a free Supabase project to sync the whole family in real time.

## Quick start (local only, 2 minutes)

1. Put this folder on any static host (GitHub Pages: push it to a repo, enable Pages).
2. Open `index.html` from the host (service workers need http(s), not `file://`).
3. Add items. Everything is stored on the device (localStorage) and works offline.

If you previously used Tally V1 on the same device/URL, your old list is **migrated
automatically** the first time V2 opens. Nothing is deleted: the old data stays in
the browser under its old key as a backup.

## Family sync setup (Supabase, ~15 minutes, beginner-friendly)

1. Create a free project at https://supabase.com → New project.
2. Enable anonymous sign-in: **Authentication → Sign In / Up → Anonymous sign-ins → ON.**
3. Open **SQL Editor**, paste the whole contents of `supabase/schema.sql`, click Run.
   - Upgrading from V1? Run `supabase/migration-v1-to-v2.sql` FIRST (it preserves
     your items), then `schema.sql`.
4. In **Project Settings → API**, copy two values:
   - Project URL (like `https://abcd1234.supabase.co`)
   - `anon` `public` key
5. Paste them into `src/app-config.js`:
   ```js
   supabase: {
     url: 'https://abcd1234.supabase.co',
     anonKey: 'eyJhbGciOi...',
   },
   ```
6. Deploy. On first open, the app asks each phone to **create a family** (first
   person) or **join with the invite code** (everyone else). The invite code is
   shown in Settings (⚙) on any phone that's already in the family.

### Which values are secret?

- The **URL and anon key are public by design** — they ship to every browser.
  Your data is protected by Row Level Security: a device can only read/write
  rows of the family it has joined.
- The **service-role key** (also on the API page) must NEVER appear in this
  project or any frontend. Tally never asks for it.

## How prices work (honestly)

Tally never invents a price.

| What you see | Meaning |
|---|---|
| `1,45 €` | Someone in the family typed this price for this item |
| `~1,45 €` + "pirms X d." | Estimate from your family's own price history (last time someone priced this product) |
| `—` | Nobody has priced it; the total simply says "N bez cenas" |

Estimates older than 60 days look dimmed. There is **no external price feed**:
no dependable, legal, public API for Latvian supermarket prices exists, so the
app relies on your family's own recorded prices and says so. Recording a price
once (e.g. while shopping) keeps future estimates fresh.

## Sync states

The pill in the top bar always tells the truth:

- **Sinhronizēts** — every change confirmed by the database and live updates connected
- **Sinhronizē…** — changes queued / connection re-establishing
- **Bezsaistē** — no network; changes are saved locally and queued
- **Sinhronizācijas kļūda** — some changes could not be sent after retries; tap to retry
- **Tikai šajā ierīcē** — Supabase not configured (local mode)

Queued changes survive page reloads (persistent outbox) and are pushed in order
when the connection returns.

## Testing

```
npm test          # unit tests (node --test, no dependencies)
```
or open `tests/run-tests.html` in a browser — same specs, browser run.
See `TEST_REPORT.md` for what was verified and how.

## Recovery

- **Corrupt local data** is never deleted: it's moved to a
  `tally-v2-state-corrupt-<timestamp>` localStorage key. Restore by copying it
  back to `tally-v2-state` in DevTools.
- **Undo**: deleting and checking items shows a 6-second "Atcelt" snackbar.
- **Failed syncs**: red pill → tap "Mēģināt vēlreiz" in the banner.

## Project layout

```
index.html             app shell (PWA, theme bootstrap)
manifest.webmanifest   installable PWA manifest
sw.js                  offline cache (network-first HTML, SWR assets)
src/
  app-config.js        ← the only file you edit (Supabase URL + anon key)
  core.js              pure logic: items, categories, prices, totals
  local-store.js       localStorage persistence + V1 migration
  queue.js             persistent outbox of unsent operations
  remote.js            Supabase: anonymous auth, family RPCs, realtime
  sync.js              orchestrates local ↔ queue ↔ remote
  app.js / sheet.js / settings.js / ui-helpers.js   UI
supabase/
  schema.sql           full V2 schema (tables, RPCs, RLS, realtime)
  migration-v1-to-v2.sql
tests/                 shared specs + node and browser runners
```
