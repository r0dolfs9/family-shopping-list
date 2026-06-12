# PLAN — Tally V2 (final state)

All checkpoints passed. This file records the executed plan and the acceptance
checklist with final status.

## Checkpoint 1 — audit (done)
Full audit of repo `r0dolfs9/family-shopping-list@main` → 15 defects, root
causes in `AUDIT.md`. Key findings: sync indicator lied (RLS returned empty
sets to the unauthenticated client), writes could never succeed, prices were
fabricated, no offline support, full-innerHTML re-renders, missing diacritics.

## Checkpoint 2 — architecture + core behaviour (done)
- Local-first store (localStorage) = UI source of truth; V1 auto-migration.
- Persistent op queue with coalescing, backoff, manual retry.
- Supabase remote: anonymous auth + invite-code family RPCs + RLS + realtime
  with reconnect/refetch; last-write-wins reconciliation.
- Price provenance: manual / family-history / none. No invented values.
- New UI: quick add, details sheet, undo snackbars, settings, setup, themes.

## Checkpoint 3 — verification + packaging (done)
21/21 unit specs pass (browser run); scripted browser flow tests pass
(`TEST_REPORT.md`); zip packaged as `family-shopping-list-v2.zip`.

## Acceptance checklist
- [x] Redesigned app runs from the delivered project (static, GitHub Pages-ready)
- [x] Every visible control works (verified by flow tests)
- [x] Core flows pass browser-level testing
- [x] Existing local data preserved/migrated (auto, non-destructive; tested)
- [x] Secure identity + family-access model (anon auth + RPC + RLS)
- [~] Real-time verified — logic unit-tested; two-phone check requires the
      user's live Supabase project (steps in TEST_REPORT.md)
- [x] Offline/failed-sync states never silently discard changes
- [x] Prices transparent about source and freshness; no fabricated values
- [x] Totals honest about unpriced items
- [x] Works at narrow phone widths and desktop
- [x] Latvian copy with correct diacritics
- [x] No known console errors in critical flows
- [x] Beginner-usable setup/deploy instructions (README)
- [x] Tests, limitations, manual steps documented truthfully (TEST_REPORT)
- [x] Downloadable ZIP produced
