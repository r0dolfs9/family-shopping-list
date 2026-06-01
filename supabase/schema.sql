create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create type member_role as enum ('owner', 'member');

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  color text not null default '#2541E0',
  initials text not null,
  role member_role not null default 'member',
  created_at timestamptz not null default now()
);

create type item_status as enum ('active', 'bought');

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  qty text,
  price_estimate numeric(10,2),
  price_guessed boolean not null default false,
  note text,
  category text not null default 'other',
  status item_status not null default 'active',
  added_by uuid references members(id),
  added_at timestamptz not null default now(),
  checked_by uuid references members(id),
  checked_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists items_family_idx on items (family_id, status, updated_at desc);

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_touch on items;
create trigger items_touch before update on items
  for each row execute function touch_updated_at();

alter table families enable row level security;
alter table members enable row level security;
alter table items enable row level security;

create or replace function my_family_ids() returns setof uuid
language sql security definer stable as $$
  select family_id from members where user_id = auth.uid()
$$;

drop policy if exists fam_read on families;
create policy fam_read on families for select
  using (id in (select my_family_ids()));

drop policy if exists fam_update on families;
create policy fam_update on families for update
  using (id in (
    select family_id from members
    where user_id = auth.uid() and role = 'owner'
  ));

drop policy if exists mem_read on members;
create policy mem_read on members for select
  using (family_id in (select my_family_ids()));

drop policy if exists mem_insert on members;
create policy mem_insert on members for insert
  with check (user_id = auth.uid());

drop policy if exists mem_update on members;
create policy mem_update on members for update
  using (user_id = auth.uid());

drop policy if exists items_all on items;
create policy items_all on items for all
  using (family_id in (select my_family_ids()))
  with check (family_id in (select my_family_ids()));

-- For first private family setup:
-- 1. Create auth users in Supabase or temporarily relax policies for seeding.
-- 2. Insert one family row.
-- 3. Insert member rows for each authenticated user.
-- 4. Enable Realtime replication for the public.items table in the Supabase dashboard.
