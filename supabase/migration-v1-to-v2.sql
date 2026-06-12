-- Migration: V1 schema → V2 schema.
-- Run AFTER backing up (Supabase Dashboard → Database → Backups, or:
--   select * from items;  → export CSV).
-- Safe to run on a V1 database; preserves existing item rows, IDs and timestamps.

-- 1. New columns on items (V1 had price_estimate + price_guessed).
alter table items add column if not exists price numeric(8,2);
alter table items add column if not exists price_source text;
alter table items add column if not exists price_updated_at timestamptz;
alter table items add column if not exists note text;

-- 2. Carry over trustworthy prices only:
--    price_guessed = false → a human typed it → manual price.
--    price_guessed = true  → fabricated estimate → dropped (by design).
update items
set price = price_estimate,
    price_source = 'manual',
    price_updated_at = coalesce(updated_at, added_at)
where coalesce(price_guessed, true) = false
  and price_estimate is not null
  and price_estimate > 0
  and price is null;

-- 3. Drop the misleading V1 columns (commented out — uncomment once verified):
-- alter table items drop column if exists price_estimate;
-- alter table items drop column if exists price_guessed;

-- 4. V1 members had no auth binding. Add user_id; existing rows stay unbound
--    (each phone re-claims its identity by joining with the invite code).
alter table members add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table members add column if not exists initials text;
alter table members add column if not exists role text not null default 'member';
-- Unique once nulls are resolved; partial index allows legacy unbound rows.
create unique index if not exists members_user_id_key on members (user_id) where user_id is not null;

-- 5. Now apply the full V2 schema (tables are guarded with IF NOT EXISTS,
--    policies are dropped/recreated): run supabase/schema.sql after this file.

-- 6. Optional clean-up of legacy unbound member rows after every device
--    has re-joined (verify display names first):
-- delete from members where user_id is null;
