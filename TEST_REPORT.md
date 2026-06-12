# TEST_REPORT — Tally V2 (2026-06-12)

## Environments
- Unit specs: 21 cases in `tests/specs.js`, executed via the browser runner
  `tests/run-tests.html` (Chromium engine). Result: **21 passed, 0 failed**.
  The same specs are wired for `npm test` (`node --test tests/node.test.js`,
  zero dependencies) — not executed in this packaging environment; run locally
  to confirm (expected identical results: the specs are environment-agnostic
  with an injected memory storage).
- Browser-level flow tests: scripted DOM interaction against the running app
  (Chromium, 920×540 and narrow ~530px content width), screenshots inspected
  at every step.

## Unit results (browser run, all ✓)
parsePrice comma/period/junk/negatives/bounds · no invented prices ·
manual provenance+timestamp · freshness manual/recent/stale/none ·
listSummary known-only totals + unpriced count + estimate flag · euro format ·
guessCategory with/without diacritics · nameKey normalization ·
grouping active-by-category + bought-last · local store roundtrip ·
corrupt state backed up not destroyed · V1 migration (guessed dropped, manual
kept, ids/timestamps preserved, V1 key untouched) · last-write-wins applyRemote ·
price history record/lookup/newest-wins merge · queue persistence + coalescing ·
delete-cancels-unsynced-insert · delete-replaces-upsert · attempt tracking +
failure surfacing + reset · row mapping roundtrip incl. NULL price · money rounding.

## Browser flow results (all verified by screenshot)
| Flow | Result |
|---|---|
| First load, no data → empty state + add bar | ✓ |
| Rapid sequential adds (4 items, same tick) | ✓ all land (an over-aggressive double-tap guard was found by this test and removed) |
| Auto-categorisation (Šokolāde→Našķi, Kartupeļi→Dārzeņi, Vistas fileja→Gaļa, Tualetes papīrs→Mājai) | ✓ |
| Edit sheet: set price 1,45 (comma decimal) → row, group and summary totals update | ✓ |
| Check off → moves to "Grozā", strikethrough, undo snackbar | ✓ |
| Undo check-off via snackbar | ✓ |
| Delete from sheet → undo restore via snackbar | ✓ |
| Unpriced items: "—" price, "N bez cenas" in summary | ✓ |
| Reload persistence (items survive reload) | ✓ |
| Theme: auto(dark) and light, switch via Settings segmented control | ✓ |
| Settings screen (theme, sync explanation, price policy) | ✓ |
| Service worker registers; shell cached; update strategy delivers new code on next load (verified after an in-test SW update) | ✓ |
| No uncaught console errors during the above | ✓ |

## Defects found BY testing during this session (all fixed, see AUDIT.md)
1. guessCategory: "šokolāde" matched drinks stem "kola" → snacks now checked first (unit test).
2. `false` leaked as literal text into the summary line (flow test).
3. Error banner visible when empty: `display:flex` overrode `hidden` (flow test).
4. Double-tap guard blocked legitimate rapid adds → removed; idempotency comes from synchronous input clearing (flow test).
5. Original SW cache-first served stale app code after deploy → stale-while-revalidate + versioned cache (flow test).
6. Theme switch left checkbox backgrounds stuck on the old theme (Chromium `transition: background` shorthand + CSS var quirk) → transition longhand `background-color` (flow test).

## Not tested here (requires real infrastructure) — how to verify
- **Two-client realtime sync**: needs a live Supabase project. Verify: open the
  deployed app on two phones in the same family; add on one → appears on the
  other within ~1s. The reconciliation logic (last-write-wins, pending-op
  protection, refetch-on-resubscribe) is unit-tested at the store level.
- **Real RLS isolation**: create two families and confirm neither sees the
  other's items (`select * from items` in SQL editor as each anon user).
- **Failed-write retry against a real backend** (queue behaviour incl. backoff
  and manual retry is unit-tested with simulated failures).
- **iOS Safari specifics** (safe-area insets, keyboard): CSS uses standard
  `env()`/`dvh`; verify once on a real device.
- **On-screen keyboard / 320px width**: layout is fluid ≥320px by construction;
  spot-check on device.

## Known limitations
- No external supermarket price feed exists (none dependable/legal for LV) —
  by design the app uses family price history only, clearly labelled.
- Conflict policy is last-write-wins per item (documented in sync.js); for a
  2–6 person household this is the right simplicity/safety trade-off.
- Anonymous auth ties identity to the browser profile; clearing site data on a
  phone requires re-joining with the invite code (data stays in the family).
