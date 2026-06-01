# Tally Family Shopping List

Static, GitHub Pages-ready family shopping list based on the handoff in `handoff/design_handoff_tally`.

## Current state

- Works now in one browser/device with `localStorage`.
- Add, edit, check off, delete, dark mode, density toggle are implemented.
- Core data behavior is covered by Node tests.
- Supabase schema is prepared in `supabase/schema.sql`.
- Real multi-phone sync still needs a Supabase Free project and credentials.

## Run locally

```bash
npm test
npm run check
```

Open `index.html` directly, or serve the folder with any static server.

## Supabase setup later

1. Create a free Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Enable Realtime for `public.items`.
4. Create family/member seed rows.
5. Copy `.env.example` values into the app configuration.

This static version currently keeps Supabase settings in `src/app-config.js`, because GitHub Pages does not read `.env` files at runtime.

## GitHub Pages

Deploy from the repository root. The app entry point is `index.html`.

Recommended repository name: `family-shopping-list`.
