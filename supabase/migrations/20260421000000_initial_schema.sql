-- ══════════════════════════════════════════════════════════════════════
-- Migration: 20260421000000_initial_schema.sql
-- Phase 1 — Foundation: trees, tree_members, people, invites
--                       + RLS + indexes + helpers + cycle detection
--                       + bootstrap_tree RPC
-- Source: .planning/phases/01-foundation/01-RESEARCH.md §4 + §6
-- ══════════════════════════════════════════════════════════════════════

begin;

-- ───── Extensions ────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ───── Enums ─────────────────────────────────────────────────────────
create type public.gender as enum ('m', 'f', 'x', 'u');
create type public.tree_role as enum ('owner', 'editor', 'viewer');
create type public.invite_status as enum ('pending', 'accepted', 'revoked');
create type public.member_status as enum ('active', 'pending');

-- ───── trees ─────────────────────────────────────────────────────────
create table public.trees (
  id              uuid primary key default gen_random_uuid(),
  name            text not null default 'My family tree',
  owner_user_id   text not null,               -- Clerk sub (e.g. 'user_2abcXYZ')
  link_share      boolean not null default false,   -- Phase 5 feature, default off
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index trees_owner_user_id_idx on public.trees (owner_user_id);

-- ───── tree_members ──────────────────────────────────────────────────
create table public.tree_members (
  tree_id         uuid not null references public.trees(id) on delete cascade,
  user_id         text not null,               -- Clerk sub
  role            public.tree_role not null,
  status          public.member_status not null default 'active',
  created_at      timestamptz not null default now(),
  primary key (tree_id, user_id)
);
create index tree_members_user_id_idx on public.tree_members (user_id);

-- ───── people ────────────────────────────────────────────────────────
create table public.people (
  id              uuid primary key default gen_random_uuid(),
  tree_id         uuid not null references public.trees(id) on delete cascade,
  name            text not null default '',
  gender          public.gender not null default 'u',
  pronouns        text,
  birth_year      int,
  death_year      int,
  birth_place     text,
  notes           text,
  spouse_ids      uuid[] not null default '{}',
  parent_ids      uuid[] not null default '{}',
  child_ids       uuid[] not null default '{}',
  x               double precision not null default 0,
  y               double precision not null default 0,
  is_me           boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- DATA-06: parent_ids max 2, self-parent rejected
  constraint people_parent_ids_max_2
    check (array_length(parent_ids, 1) is null or array_length(parent_ids, 1) <= 2),
  constraint people_no_self_parent
    check (not (id = any(parent_ids))),
  constraint people_no_self_spouse
    check (not (id = any(spouse_ids))),
  constraint people_no_self_child
    check (not (id = any(child_ids))),
  constraint people_birth_death_order
    check (death_year is null or birth_year is null or death_year >= birth_year)
);
create index people_tree_id_idx        on public.people (tree_id);
create index people_spouse_ids_gin     on public.people using gin (spouse_ids);
create index people_parent_ids_gin     on public.people using gin (parent_ids);
create index people_child_ids_gin      on public.people using gin (child_ids);

-- DATA-09: exactly zero or one is_me=true person per tree
create unique index people_is_me_unique_per_tree
  on public.people (tree_id) where is_me = true;

-- ───── invites ───────────────────────────────────────────────────────
create table public.invites (
  id              uuid primary key default gen_random_uuid(),
  tree_id         uuid not null references public.trees(id) on delete cascade,
  email           text not null,
  role            public.tree_role not null default 'viewer',
  status          public.invite_status not null default 'pending',
  invited_by      text not null,               -- Clerk sub of inviter
  token           text not null unique,        -- random URL-safe token
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz
);
create index invites_tree_id_idx on public.invites (tree_id);
create index invites_email_idx   on public.invites (email);

-- ───── updated_at triggers ───────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_people_updated_at
  before update on public.people
  for each row execute function public.touch_updated_at();
create trigger trg_trees_updated_at
  before update on public.trees
  for each row execute function public.touch_updated_at();

-- ───── SECURITY DEFINER helper: user_tree_ids ───────────────────────
-- PITFALL #6: breaks cross-table RLS recursion by bypassing RLS on lookup
create or replace function public.user_tree_ids(uid text)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select tree_id from public.tree_members where user_id = uid and status = 'active'
$$;

-- ───── Cycle detection (DATA-07) ─────────────────────────────────────
-- Walks ancestor graph via parent_ids. Returns true if `candidate_parent_id`
-- is a descendant of `child_id` (which would create a cycle).
create or replace function public.creates_parent_cycle(
  p_tree_id uuid,
  p_child_id uuid,
  p_candidate_parent_id uuid
) returns boolean language plpgsql stable as $$
declare
  visited uuid[] := array[]::uuid[];
  queue uuid[] := array[p_candidate_parent_id];
  cur uuid;
  parents uuid[];
begin
  -- Self-parent shortcut (also enforced by CHECK constraint)
  if p_child_id = p_candidate_parent_id then return true; end if;
  while array_length(queue, 1) > 0 loop
    cur := queue[1];
    queue := queue[2:];
    if cur = any(visited) then continue; end if;
    visited := visited || cur;
    -- If we can reach p_child_id walking UP parents from candidate, cycle.
    if cur = p_child_id then return true; end if;
    select p.parent_ids into parents from public.people p
      where p.id = cur and p.tree_id = p_tree_id;
    if parents is not null then queue := queue || parents; end if;
  end loop;
  return false;
end;
$$;

-- ───── Enable RLS ────────────────────────────────────────────────────
alter table public.trees         enable row level security;
alter table public.tree_members  enable row level security;
alter table public.people        enable row level security;
alter table public.invites       enable row level security;
alter table public.trees         force row level security;
alter table public.tree_members  force row level security;
alter table public.people        force row level security;
alter table public.invites       force row level security;

-- ───── RLS policies — see RESEARCH.md §5 for full discussion ─────────
-- trees
create policy "trees_select_if_accessible" on public.trees for select
  using (
    owner_user_id = (select auth.jwt()->>'sub')
    or link_share = true
    or id in (select public.user_tree_ids((select auth.jwt()->>'sub')))
  );
create policy "trees_insert_own" on public.trees for insert
  with check (owner_user_id = (select auth.jwt()->>'sub'));
create policy "trees_update_if_owner_or_editor" on public.trees for update
  using (
    owner_user_id = (select auth.jwt()->>'sub')
    or exists (
      select 1 from public.tree_members tm
      where tm.tree_id = trees.id
        and tm.user_id = (select auth.jwt()->>'sub')
        and tm.role in ('owner', 'editor')
        and tm.status = 'active'
    )
  );
create policy "trees_delete_if_owner" on public.trees for delete
  using (owner_user_id = (select auth.jwt()->>'sub'));

-- tree_members
create policy "tree_members_select_own_or_co_member" on public.tree_members for select
  using (
    user_id = (select auth.jwt()->>'sub')
    or tree_id in (select public.user_tree_ids((select auth.jwt()->>'sub')))
  );
create policy "tree_members_insert_by_owner" on public.tree_members for insert
  with check (
    exists (
      select 1 from public.trees t
      where t.id = tree_members.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  );
create policy "tree_members_update_by_owner" on public.tree_members for update
  using (
    exists (
      select 1 from public.trees t
      where t.id = tree_members.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  );
create policy "tree_members_delete_by_owner_or_self" on public.tree_members for delete
  using (
    user_id = (select auth.jwt()->>'sub')
    or exists (
      select 1 from public.trees t
      where t.id = tree_members.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  );

-- people
create policy "people_select_if_tree_accessible" on public.people for select
  using (
    tree_id in (select public.user_tree_ids((select auth.jwt()->>'sub')))
    or exists (
      select 1 from public.trees t
      where t.id = people.tree_id
        and (t.owner_user_id = (select auth.jwt()->>'sub') or t.link_share = true)
    )
  );
create policy "people_insert_if_editor_or_owner" on public.people for insert
  with check (
    exists (
      select 1 from public.trees t
      where t.id = people.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
    or exists (
      select 1 from public.tree_members tm
      where tm.tree_id = people.tree_id
        and tm.user_id = (select auth.jwt()->>'sub')
        and tm.role in ('owner', 'editor')
        and tm.status = 'active'
    )
  );
create policy "people_update_if_editor_or_owner" on public.people for update
  using (
    exists (
      select 1 from public.trees t
      where t.id = people.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
    or exists (
      select 1 from public.tree_members tm
      where tm.tree_id = people.tree_id
        and tm.user_id = (select auth.jwt()->>'sub')
        and tm.role in ('owner', 'editor')
        and tm.status = 'active'
    )
  );
create policy "people_delete_if_editor_or_owner" on public.people for delete
  using (
    exists (
      select 1 from public.trees t
      where t.id = people.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
    or exists (
      select 1 from public.tree_members tm
      where tm.tree_id = people.tree_id
        and tm.user_id = (select auth.jwt()->>'sub')
        and tm.role in ('owner', 'editor')
        and tm.status = 'active'
    )
  );

-- invites (owner only; accept-by-token flow uses a SECURITY DEFINER function)
create policy "invites_select_if_owner" on public.invites for select
  using (
    exists (
      select 1 from public.trees t
      where t.id = invites.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  );
create policy "invites_mutate_if_owner" on public.invites for all
  using (
    exists (
      select 1 from public.trees t
      where t.id = invites.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  )
  with check (
    exists (
      select 1 from public.trees t
      where t.id = invites.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  );

-- ───── bootstrap_tree RPC (TREE-01) ──────────────────────────────────
-- SECURITY DEFINER: bypasses RLS inside the function body so the 3 inserts
-- (tree + owner membership + seed person) land atomically. Body explicitly
-- asserts `p_owner_user_id = auth.jwt()->>'sub'` so a caller cannot spoof
-- another user's tree.
create or replace function public.bootstrap_tree(
  p_owner_user_id text,
  p_tree_name text,
  p_seed_person_name text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_tree_id uuid;
  new_person_id uuid;
begin
  -- Sanity: caller must match JWT sub
  if p_owner_user_id is null or p_owner_user_id <> (auth.jwt()->>'sub') then
    raise exception 'UNAUTHORIZED: p_owner_user_id must equal JWT sub';
  end if;

  -- Insert tree
  insert into public.trees (name, owner_user_id)
    values (p_tree_name, p_owner_user_id)
    returning id into new_tree_id;

  -- Insert owner membership
  insert into public.tree_members (tree_id, user_id, role, status)
    values (new_tree_id, p_owner_user_id, 'owner', 'active');

  -- Seed "You" person
  insert into public.people (tree_id, name, is_me, x, y)
    values (new_tree_id, p_seed_person_name, true, 0, 0)
    returning id into new_person_id;

  return new_tree_id;
end;
$$;

-- Allow authenticated users to call the RPC
grant execute on function public.bootstrap_tree(text, text, text) to authenticated;

commit;
