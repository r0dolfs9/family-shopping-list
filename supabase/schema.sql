-- Tally V2 schema — fresh install.
-- Identity model: each device signs in with Supabase ANONYMOUS auth
-- (enable it: Authentication → Providers → Anonymous sign-ins).
-- A device then calls create_family() or join_family(invite_code),
-- which creates a `members` row binding auth.uid() to a family.
-- All RLS keys off that binding. No service-role key is ever used by the app.

-- ========== Tables ==========

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  color text,
  initials text,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key,
  family_id uuid not null references families (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  qty text,
  note text,
  category text not null default 'other',
  status text not null default 'active' check (status in ('active', 'bought')),
  price numeric(8, 2) check (price is null or price >= 0),
  price_source text check (price_source in ('manual', 'history')),
  price_updated_at timestamptz,
  added_by uuid references members (id) on delete set null,
  added_at timestamptz not null default now(),
  checked_by uuid references members (id) on delete set null,
  checked_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists items_family_idx on items (family_id, status, updated_at desc);

create table if not exists price_history (
  family_id uuid not null references families (id) on delete cascade,
  name_key text not null check (char_length(name_key) between 1 and 120),
  price numeric(8, 2) not null check (price >= 0),
  recorded_at timestamptz not null default now(),
  recorded_by uuid references members (id) on delete set null,
  primary key (family_id, name_key)
);

-- ========== Helpers ==========

create or replace function my_family_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select family_id from members where user_id = auth.uid();
$$;

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists items_touch on items;
create trigger items_touch before update on items
  for each row execute function touch_updated_at();

-- ========== Family membership RPCs ==========
-- SECURITY DEFINER so an authenticated-but-memberless user can create/join.

create or replace function create_family(
  p_family_name text,
  p_display_name text,
  p_color text default null,
  p_initials text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'already a member of a family';
  end if;
  -- 6-char unambiguous invite code.
  v_code := upper(substr(replace(replace(replace(encode(gen_random_bytes(8), 'base64'), '/', ''), '+', ''), '=', ''), 1, 6));
  insert into families (name, invite_code) values (trim(p_family_name), v_code) returning id into v_family_id;
  insert into members (family_id, user_id, display_name, color, initials, role)
    values (v_family_id, auth.uid(), trim(p_display_name), p_color, p_initials, 'owner');
  return v_family_id;
end;
$$;

create or replace function join_family(
  p_invite_code text,
  p_display_name text,
  p_color text default null,
  p_initials text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'already a member of a family';
  end if;
  select id into v_family_id from families where invite_code = upper(trim(p_invite_code));
  if v_family_id is null then
    raise exception 'invite code not found';
  end if;
  insert into members (family_id, user_id, display_name, color, initials)
    values (v_family_id, auth.uid(), trim(p_display_name), p_color, p_initials);
  return v_family_id;
end;
$$;

revoke all on function create_family(text, text, text, text) from public;
revoke all on function join_family(text, text, text, text) from public;
grant execute on function create_family(text, text, text, text) to authenticated;
grant execute on function join_family(text, text, text, text) to authenticated;

-- ========== Row Level Security ==========

alter table families enable row level security;
alter table members enable row level security;
alter table items enable row level security;
alter table price_history enable row level security;

drop policy if exists families_select on families;
create policy families_select on families
  for select using (id in (select my_family_ids()));

drop policy if exists members_select on members;
create policy members_select on members
  for select using (family_id in (select my_family_ids()) or user_id = auth.uid());

drop policy if exists items_select on items;
create policy items_select on items
  for select using (family_id in (select my_family_ids()));
drop policy if exists items_insert on items;
create policy items_insert on items
  for insert with check (family_id in (select my_family_ids()));
drop policy if exists items_update on items;
create policy items_update on items
  for update using (family_id in (select my_family_ids()))
  with check (family_id in (select my_family_ids()));
drop policy if exists items_delete on items;
create policy items_delete on items
  for delete using (family_id in (select my_family_ids()));

drop policy if exists price_history_select on price_history;
create policy price_history_select on price_history
  for select using (family_id in (select my_family_ids()));
drop policy if exists price_history_insert on price_history;
create policy price_history_insert on price_history
  for insert with check (family_id in (select my_family_ids()));
drop policy if exists price_history_update on price_history;
create policy price_history_update on price_history
  for update using (family_id in (select my_family_ids()))
  with check (family_id in (select my_family_ids()));

-- ========== Realtime ==========
-- Add items to the realtime publication (idempotent guard).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table items;
  end if;
end;
$$;
