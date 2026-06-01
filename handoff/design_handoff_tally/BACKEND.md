# Tally — Backend implementation guide (Supabase)

Everything needed to turn the prototype into a real, multi-device, real-time app. Firebase
(Firestore + Auth) is a valid alternative; this guide uses **Supabase** (Postgres + Realtime +
Auth + RLS) because the relational model and row-level security fit a shared family list well.

> Estimated effort for a working MVP: ~1 week for one developer.

---

## 0. Stack

- **Client:** Next.js (App Router) for web/PWA, **or** Expo / React Native for native iOS+Android.
- **Backend:** Supabase — Postgres, Realtime, Auth (magic-link/OTP), Edge Functions (invites).
- **Lib:** `@supabase/supabase-js` v2.

```bash
npm i @supabase/supabase-js
```

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

`.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 1. Database schema

Run in the Supabase SQL editor.

```sql
-- families ----------------------------------------------------------
create table families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

-- members: links an auth user to a family --------------------------
create type member_role as enum ('owner', 'member');

create table members (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  color        text not null default '#2541E0',   -- avatar color
  initials     text not null,
  role         member_role not null default 'member',
  created_at   timestamptz not null default now(),
  unique (family_id, user_id)
);

-- items -------------------------------------------------------------
create type item_status as enum ('active', 'bought');

create table items (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families(id) on delete cascade,
  name           text not null,
  qty            text,                       -- free text: "2", "500 g"
  price_estimate numeric(10,2),              -- null = use estimator
  price_guessed  boolean not null default false,
  note           text,
  category       text not null default 'other',
  status         item_status not null default 'active',
  added_by       uuid references members(id),
  added_at       timestamptz not null default now(),
  checked_by     uuid references members(id),
  checked_at     timestamptz,
  sort_index     bigint not null default 0,
  updated_at     timestamptz not null default now()
);

create index items_family_idx on items (family_id, status);

-- keep updated_at fresh
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
create trigger items_touch before update on items
  for each row execute function touch_updated_at();
```

**Categories** are stored as a stable string key (`produce`, `fruit`, `meat`, `dairy`,
`bakery`, `drinks`, `snacks`, `frozen`, `household`, `other`). Keep the label/hue map on the
client (it's in `app/data.jsx → CATEGORIES`). Add a `categories` table only if families should
customize them.

---

## 2. Row-Level Security

A user may only touch rows belonging to a family they're a member of.

```sql
alter table families enable row level security;
alter table members  enable row level security;
alter table items    enable row level security;

-- helper: families the current user belongs to
create or replace function my_family_ids() returns setof uuid
language sql security definer stable as $$
  select family_id from members where user_id = auth.uid()
$$;

-- families: read your own; update only if owner
create policy fam_read on families for select
  using (id in (select my_family_ids()));
create policy fam_update on families for update
  using (id in (select family_id from members
                where user_id = auth.uid() and role = 'owner'));

-- members: read members of your families; insert/update yourself
create policy mem_read on members for select
  using (family_id in (select my_family_ids()));
create policy mem_insert on members for insert
  with check (user_id = auth.uid());
create policy mem_update on members for update
  using (user_id = auth.uid());

-- items: full CRUD within your families
create policy items_all on items for all
  using (family_id in (select my_family_ids()))
  with check (family_id in (select my_family_ids()));
```

---

## 3. Realtime sync

Enable realtime on `items` (Dashboard → Database → Replication, add `items`), then subscribe:

```ts
// hooks/useItems.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useItems(familyId: string) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!familyId) return;
    let active = true;

    supabase.from('items').select('*')
      .eq('family_id', familyId)
      .order('sort_index', { ascending: false })
      .then(({ data }) => { if (active && data) setItems(data); });

    const channel = supabase
      .channel(`items:${familyId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `family_id=eq.${familyId}` },
        (payload) => {
          setItems((cur) => {
            if (payload.eventType === 'INSERT') return [payload.new as Item, ...cur];
            if (payload.eventType === 'DELETE') return cur.filter(i => i.id !== (payload.old as Item).id);
            return cur.map(i => i.id === (payload.new as Item).id ? (payload.new as Item) : i);
          });
        })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [familyId]);

  return items;
}
```

This **replaces** the prototype's `setItems` + `REMOTE_SCRIPT`. Every other family member's
device receives the same events — the toast in `Toast`/`App.jsx` maps to an INSERT/UPDATE
from a member other than the current user.

### Mutations (optimistic)
```ts
export const addItem = (familyId: string, memberId: string, draft: Draft) =>
  supabase.from('items').insert({
    family_id: familyId, name: draft.name, qty: draft.qty,
    price_estimate: draft.price || null, price_guessed: !draft.price,
    note: draft.note, category: draft.cat, added_by: memberId,
    sort_index: Date.now(),
  });

export const toggleItem = (item: Item, memberId: string) =>
  supabase.from('items').update(
    item.status === 'active'
      ? { status: 'bought', checked_by: memberId, checked_at: new Date().toISOString() }
      : { status: 'active', checked_by: null, checked_at: null }
  ).eq('id', item.id);

export const removeItem = (id: string) =>
  supabase.from('items').delete().eq('id', id);
```
Apply changes to local state immediately (optimistic) and let the realtime echo reconcile.
Conflicts are last-write-wins per field, which is fine for a shopping list.

---

## 4. Auth + onboarding

Magic-link (passwordless) is the lowest-friction option.

```ts
await supabase.auth.signInWithOtp({ email });   // sends a login link
const { data: { user } } = await supabase.auth.getUser();
```

**First run:** after sign-in, if the user has no `members` row, show the onboarding choice:
**create a family** or **join with a code** (the prototype's Invite/Family sheet).

```ts
// create a family + owner membership
async function createFamily(name: string, displayName: string) {
  const code = genCode();                       // e.g. "K7P-29Q"
  const { data: fam } = await supabase.from('families')
    .insert({ name, invite_code: code }).select().single();
  await supabase.from('members').insert({
    family_id: fam.id, user_id: (await supabase.auth.getUser()).data.user!.id,
    display_name: displayName, initials: initialsOf(displayName), role: 'owner',
  });
  return fam;
}
```

---

## 5. Invite / join flow (Edge Function)

Validate the code server-side so RLS can't be bypassed, then insert the membership.

```ts
// supabase/functions/join-family/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { code, displayName } = await req.json();
  const authHeader = req.headers.get('Authorization')!;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!,
                             Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!,
                                  Deno.env.get('SUPABASE_ANON_KEY')!,
                                  { global: { headers: { Authorization: authHeader } } });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: fam } = await admin.from('families')
    .select('id').eq('invite_code', code).single();
  if (!fam) return new Response('Invalid code', { status: 404 });

  await admin.from('members').insert({
    family_id: fam.id, user_id: user.id,
    display_name: displayName, initials: initialsOf(displayName), role: 'member',
  });
  return Response.json({ family_id: fam.id });
});
```
The shareable link `tally.app/join/<code>` should deep-link into this flow (prefill the code).
Rotate `invite_code` from the owner's settings if needed.

---

## 6. Offline (PWA / native)

- Optimistic local writes (above) already make the UI feel offline-tolerant.
- For true offline, queue mutations in IndexedDB (web) / SQLite (RN) and flush on reconnect;
  on reconnect, re-fetch the list and let realtime resume. Last-write-wins per field is the
  conflict policy. A library like **PowerSync** or **Replicache** can manage this if you want
  stronger guarantees, but it's optional for an MVP.

---

## 7. Price estimates (the one approximate feature)

The prototype fills an empty price from a local keyword/category table (`guessPrice` in
`app/data.jsx`). Production options, cheapest → richest:
1. **Keep the table** server-side (a `price_estimates` table keyed by keyword/category) — instant,
   offline, approximate. Good enough to launch.
2. **Crowd-sourced:** when members enter real prices, average them per item name + region to
   improve future estimates.
3. **Live store prices:** scrape/ingest Rimi / Maxima / Barbora catalogs into a `prices` table on
   a schedule. No clean official API exists, so this is the highest-maintenance path — treat as v2.

Mark any estimated price (`price_guessed = true`) and render it with the "≈" treatment so users
know it's not a real receipt price.

---

## 8. Build checklist
- [ ] Create Supabase project; run schema (§1) + RLS (§2).
- [ ] Enable Realtime replication on `items` (§3).
- [ ] Recreate the 4 screens from `README.md` in your framework (tokens + components).
- [ ] Wire `useItems` + optimistic mutations (§3).
- [ ] Magic-link auth + first-run create/join family (§4–5).
- [ ] Deploy `join-family` Edge Function; wire the invite sheet + deep link.
- [ ] Ship as PWA (web) or build via EAS (Expo); add the offline queue if desired (§6).
- [ ] Decide price-estimate strategy (§7).
