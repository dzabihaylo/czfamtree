# Architecture Research

**Domain:** Collaborative canvas-based family tree web app (Next.js 14 + Supabase + Clerk + Realtime)
**Researched:** 2026-04-21
**Confidence:** HIGH (stack is well-established; patterns verified against official docs)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                             │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Next.js App Router (RSC)                   │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ /login   │  │ /(app)   │  │ /tree/   │  │ /api/    │      │    │
│  │  │ (server) │  │ layout   │  │ [treeId] │  │ actions  │      │    │
│  │  └──────────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │    │
│  └──────────────────────┼─────────────┼─────────────┼────────────┘    │
│                         │             │             │                  │
│  ┌──────────────────────┴─────────────┴─────────────┴────────────┐    │
│  │                  Client Components (interactivity)             │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │    │
│  │  │ <Canvas> │ │<NodeLayer│ │<EdgeLayer│ │<Toolbar> │         │    │
│  │  │ pan/zoom │ │  (divs)  │ │   (SVG)  │ │  (pill)  │         │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘         │    │
│  │  ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐         │    │
│  │  │<Topbar>  │ │<SidePanel│ │<Radial>  │ │<ShareMod │         │    │
│  │  │          │ │  form    │ │  menu    │ │   al>    │         │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │                                          │
│  ┌──────────────────────────┴───────────────────────────────────┐    │
│  │              Zustand Store (per request, factory pattern)     │    │
│  │   people | selectedId | transform | radial | history | toast  │    │
│  │   presence | pendingEdits | lastSavedAt | sidePanelOpen       │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │                                          │
│  ┌──────────────────────────┴───────────────────────────────────┐    │
│  │        Supabase Realtime client (browser WebSocket)          │    │
│  │           channel = `tree:${treeId}`                          │    │
│  │           events: presence_sync, broadcast:person_update,     │    │
│  │                   broadcast:person_move, broadcast:structural │    │
│  └─────┬────────────────────────────────────────────────────────┘    │
└────────┼──────────────────────────────────────────────────────────────┘
         │         ▲                                                     
    ┌────┴────┐    │ (Clerk session token, authed via native integration)
    │  Clerk  │    │                                                     
    │ (Auth)  │    │                                                     
    └────┬────┘    │                                                     
         │ JWT     │                                                     
         ▼         │                                                     
┌──────────────────┴────────────────────────────────────────────────────┐
│                         Supabase (Postgres)                            │
│  ┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │  REST/PostgREST   │  │  Realtime server  │  │  Storage (v2?)   │  │
│  │  (authenticated   │  │  (WebSocket hub;  │  │  avatars bucket  │  │
│  │   via Clerk JWT)  │  │   RLS-aware)      │  │  (post-v1)       │  │
│  └─────────┬─────────┘  └─────────┬─────────┘  └──────────────────┘  │
│            │                      │                                    │
│  ┌─────────┴──────────────────────┴───────────────────────────────┐  │
│  │                       PostgreSQL                               │  │
│  │   trees | people | tree_members | invites                     │  │
│  │   + RLS policies (auth.jwt()->>'sub' = clerk_user_id)          │  │
│  └────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation Notes |
|-----------|----------------|----------------------|
| `<Canvas>` (client) | Owns pan/zoom transform, wheel/drag listeners, canvas-space ↔ screen-space math | Single `transform: {x, y, k}` in Zustand; CSS `translate3d(x,y,0) scale(k)` on inner layer |
| `<NodeLayer>` (client) | Renders `PersonNode` divs at stored x/y inside transformed parent | Maps `people` array → memoized node components; drag commits to history on mouseup |
| `<EdgeLayer>` (client) | Renders SVG `<path>` elements for spouse + parent-child edges | Consumes `computeEdges(people)` selector; sits *under* node layer; non-interactive |
| `<PersonNode>` (client) | 180×76 card: avatar, name, years, gender accent stripe, + button when selected | Pure presentational; receives `person` + `isSelected` props |
| `<RadialMenu>` (client) | 4-slice pie over selected node; dispatches `addRelative(anchorId, kind)` | Portal'd at anchor's screen-space coords; Esc/outside-click dismiss |
| `<SidePanel>` (client) | Right-docked 380px drawer; edit person fields; read-only relationships | Debounced autosave to server action; mirrors pending state via `lastSavedAt` |
| `<Topbar>` (client) | Tree name (editable inline), Share button, collaborator avatars, user menu | Subscribes to `presence` slice from Zustand |
| `<Toolbar>` (client) | Floating pill: undo/redo/zoom/fit/tidy/panel toggle | Only reads from store + dispatches actions |
| `<ShareModal>` (client) | Invite by email, role select, link-share toggle | Calls server actions; list refreshed via `revalidatePath` + Realtime |
| `useTreeStore` (Zustand, client) | Single source of truth for `people`, `selectedId`, `transform`, `history`, `radial`, `toast`, `presence`, `lastSavedAt` | Created per-request via store factory + Context Provider (Next.js SSR pattern) |
| `lib/computeEdges.ts` (shared) | Pure: `people[] → Edge[]` | Unit-tested with Vitest; used by both server (first paint) and client |
| `lib/layoutTidy.ts` (shared) | Pure: wraps `dagre` with couple-merge logic; returns new positions | Dispatched via toolbar ✨ button; commits full snapshot to history |
| `lib/supabase/server.ts` | Server-side Supabase client factory using Clerk's `auth().getToken()` | Runs in server actions + RSC |
| `lib/supabase/browser.ts` | Browser Supabase client; `accessToken: () => session.getToken()` via Clerk hook | Single instance per mount; supplies Realtime channel |
| `lib/realtime.ts` (client) | Subscribes to `tree:${treeId}`; merges broadcast events into Zustand; manages presence track/untrack | Throttles outgoing `person_move` broadcasts to ~30Hz during drag |
| Server actions (`app/actions/*`) | `createTree`, `updatePerson`, `addRelative`, `removePerson`, `moveNode`, `invite`, `acceptInvite` | Authed via Clerk + server Supabase client; revalidate paths; return typed Results |

---

## Recommended Project Structure

```
czfamtree/
├── app/                              # Next.js App Router
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (app)/                        # Authed routes
│   │   ├── layout.tsx                # Requires Clerk session; renders <Topbar>
│   │   ├── page.tsx                  # Tree picker / "last opened tree" redirect
│   │   └── tree/[treeId]/
│   │       ├── page.tsx              # RSC: fetch people, pass to <TreeView>
│   │       └── TreeView.tsx          # "use client" — root of canvas UI
│   ├── actions/                      # Server actions
│   │   ├── trees.ts                  # createTree, renameTree
│   │   ├── people.ts                 # updatePerson, addRelative, removePerson, moveNode
│   │   └── invites.ts                # invite, acceptInvite, revokeInvite, setRole
│   ├── api/
│   │   └── webhooks/clerk/route.ts   # Clerk → Supabase user mirroring (optional)
│   ├── layout.tsx                    # <ClerkProvider>, fonts, globals
│   └── globals.css                   # Tailwind + design token CSS vars
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx                # pan/zoom surface
│   │   ├── NodeLayer.tsx
│   │   ├── EdgeLayer.tsx
│   │   ├── PersonNode.tsx
│   │   └── RadialMenu.tsx
│   ├── panel/
│   │   ├── SidePanel.tsx
│   │   └── AutoSavePill.tsx
│   ├── topbar/
│   │   ├── Topbar.tsx
│   │   ├── PresenceAvatars.tsx
│   │   └── TreeNameEditor.tsx
│   ├── toolbar/Toolbar.tsx
│   ├── share/
│   │   ├── ShareModal.tsx
│   │   └── InviteRow.tsx
│   └── ui/                           # shadcn-style primitives (Button, Input, Pill, Toast)
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # server-side client (Clerk token)
│   │   └── browser.ts                # browser client + Realtime
│   ├── store/
│   │   ├── createTreeStore.ts        # Zustand factory (no singleton)
│   │   └── TreeStoreProvider.tsx     # Context provider; hydrates from server data
│   ├── model/
│   │   ├── types.ts                  # Person, Edge, TreeMember, Invite
│   │   ├── computeEdges.ts           # pure; Vitest-tested
│   │   ├── layoutTidy.ts             # dagre wrapper
│   │   ├── collisionNudge.ts         # pure; on-add positioning
│   │   └── history.ts                # snapshot push/undo/redo helpers
│   ├── realtime/
│   │   ├── channel.ts                # subscribe/unsubscribe per treeId
│   │   └── events.ts                 # typed payload shapes
│   └── utils/
│       ├── clerk.ts                  # getUserId() helper for server actions
│       └── ids.ts                    # uid()
├── db/
│   ├── migrations/                   # Supabase SQL migrations (0001_init.sql, …)
│   └── policies.sql                  # RLS policies, versioned
├── public/
├── tests/
│   ├── unit/                         # Vitest: model/*
│   └── e2e/                          # Playwright: sign-in, add relative, share
├── middleware.ts                     # Clerk route protection
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

### Structure Rationale

- **`app/(app)/tree/[treeId]/`**: Route-per-tree keeps deep-linking + sharing natural; RSC fetches initial `people` with Clerk-authed Supabase client and passes to client provider (avoids client-side loading flash).
- **`app/actions/` over `app/api/`**: Server actions are the ergonomic path for mutations tied to RSC pages; typed end-to-end; pair with `revalidatePath` for cache invalidation. Reserve `app/api/` for webhooks and public endpoints.
- **`lib/model/`**: Pure, framework-agnostic domain logic. Every function is unit-testable without mounting React. This is where `computeEdges`, `layoutTidy`, `collisionNudge`, and `history` live — matches handoff's `model.jsx` but split for testability.
- **`lib/store/` factory + provider**: Next.js SSR requires per-request stores (never module-scoped) to prevent cross-user state leaks. Factory + Provider is the documented Zustand pattern.
- **`db/` alongside app**: Migrations and RLS policies versioned with app code; keeps schema drift from going undetected.

---

## Architectural Patterns

### Pattern 1: Derived Edges (single source of truth)

**What:** Never store edges. Relationships live only in `people.spouse_ids`, `people.parent_ids`, `people.child_ids`. `computeEdges(people)` derives SVG paths.

**When to use:** Always, for this app. Edges are a projection of relationships; storing them means two sources to keep consistent.

**Trade-offs:** (+) One mutation path — edit a relationship array, edges re-render automatically. (−) Must denormalize symmetric relationships on write (adding A as B's spouse also adds B as A's spouse in a single transaction).

```typescript
// lib/model/computeEdges.ts
export type Edge =
  | { kind: 'spouse'; aId: string; bId: string }
  | { kind: 'parent'; parentCoupleKey: string; childId: string };

export function computeEdges(people: Person[]): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const p of people) {
    for (const sId of p.spouseIds) {
      const key = [p.id, sId].sort().join('|');
      if (!seen.has(key)) { edges.push({ kind: 'spouse', aId: p.id, bId: sId }); seen.add(key); }
    }
    for (const cId of p.childIds) {
      const parents = [p.id, ...(p.spouseIds.filter(s => people.find(q => q.id === s)?.childIds.includes(cId)))].sort();
      edges.push({ kind: 'parent', parentCoupleKey: parents.join('|'), childId: cId });
    }
  }
  return edges;
}
```

### Pattern 2: Optimistic Local, Authoritative Server, Reconcile via Realtime

**What:** Mutations apply to Zustand *immediately* (optimistic), fire a server action in parallel, and are reconciled when Realtime echoes the change (or via server action error → rollback).

**When to use:** Any structural mutation (add, remove, move, edit field).

**Trade-offs:** (+) Instant feedback at design-fidelity target. (−) Must implement rollback. (−) Need to dedupe echoes (either via `senderId` field or Realtime's `self: false` default).

```typescript
// Inside a Zustand action
async function updatePerson(id: string, patch: Partial<Person>) {
  const prev = get().people.find(p => p.id === id);
  set(state => ({ people: state.people.map(p => p.id === id ? { ...p, ...patch } : p) }));
  const result = await updatePersonAction({ personId: id, patch });
  if (!result.ok) {
    set(state => ({ people: state.people.map(p => p.id === id ? prev! : p), toast: 'Save failed — changes reverted' }));
  } else {
    set({ lastSavedAt: Date.now() });
    // Also broadcast to peers (server writes are not broadcast automatically)
    broadcast({ type: 'person_update', id, patch, senderId: clientId });
  }
}
```

### Pattern 3: Server-first initial render, client store hydration

**What:** `app/(app)/tree/[treeId]/page.tsx` is a server component that fetches `people` with a Clerk-authed Supabase client, then passes the snapshot to a client component that creates the per-request Zustand store via a Provider.

**When to use:** Every authed page with non-trivial state — avoids loading spinners, SEO-friendly, and prevents the SSR store-sharing security issue.

**Trade-offs:** (+) No client-side fetch waterfall. (+) Immediate canvas paint. (−) Requires the factory/provider pattern (documented by Zustand).

```typescript
// app/(app)/tree/[treeId]/page.tsx (server)
export default async function Page({ params }: { params: { treeId: string } }) {
  const supabase = await createServerSupabase();  // uses Clerk token
  const { data: people } = await supabase.from('people').select('*').eq('tree_id', params.treeId);
  const { data: tree }   = await supabase.from('trees').select('*').eq('id', params.treeId).single();
  return <TreeView initialPeople={people ?? []} tree={tree} />;
}

// components/tree/TreeView.tsx
'use client';
export function TreeView({ initialPeople, tree }: Props) {
  return (
    <TreeStoreProvider initialPeople={initialPeople} treeId={tree.id}>
      <Topbar />
      <Canvas><EdgeLayer /><NodeLayer /></Canvas>
      <Toolbar />
      <SidePanel />
      <RealtimeBridge treeId={tree.id} />   {/* mounts subscription */}
    </TreeStoreProvider>
  );
}
```

### Pattern 4: History as snapshot array (not deltas)

**What:** `history: Person[][]`, `hIndex: number`. Every structural mutation pushes a deep copy of `people` onto history.

**When to use:** V1 only. Family trees stay small (dozens to a few hundred nodes) — full snapshots are fine and dead simple.

**Trade-offs:** (+) Trivial to implement + debug. (+) Matches handoff prototype. (−) Memory grows linearly with edits; cap history at ~100 entries. (−) Cannot replay granular server events; that's fine for v1 since history is client-local.

### Pattern 5: Per-tree Realtime channel with typed event envelopes

**What:** One channel per open tree: `tree:${treeId}`. Three event types (`broadcast` type): `person_update`, `person_move`, `structural`. Presence holds `{ userId, name, avatarUrl, cursor? }`.

**When to use:** Always. Scoping by tree keeps payloads small and RLS-authorization clean.

**Trade-offs:** (+) Clean mental model; one subscription per page. (+) Easy to authorize (only channel subs for trees you can read are allowed). (−) Opening multiple trees = multiple channels (fine at expected concurrency).

See [Realtime Channel Shape](#realtime-channel-shape) below for the full payload spec.

---

## Database Schema

### SQL (PostgreSQL / Supabase)

```sql
-- Extensions
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────
-- trees: a tree is owned by the user who created it
-- ──────────────────────────────────────────────────────────────────────
create table public.trees (
  id              uuid primary key default gen_random_uuid(),
  name            text not null default 'Untitled tree',
  owner_user_id   text not null,            -- Clerk user id (JWT sub)
  link_share      boolean not null default false,   -- "Anyone with link can view"
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.trees (owner_user_id);

-- ──────────────────────────────────────────────────────────────────────
-- tree_members: membership table; owner gets a row on tree create.
-- This is the single source of truth for "who can access what".
-- ──────────────────────────────────────────────────────────────────────
create type public.tree_role as enum ('owner', 'editor', 'viewer');

create table public.tree_members (
  tree_id         uuid not null references public.trees(id) on delete cascade,
  user_id         text not null,            -- Clerk user id
  role            public.tree_role not null,
  joined_at       timestamptz not null default now(),
  primary key (tree_id, user_id)
);
create index on public.tree_members (user_id);

-- ──────────────────────────────────────────────────────────────────────
-- people: the nodes. Relationships are stored as arrays of person ids
-- per handoff's data model. Edges are DERIVED client-side via
-- computeEdges(people), never stored.
-- ──────────────────────────────────────────────────────────────────────
create type public.gender as enum ('m', 'f', 'x', 'u');

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
  is_me           boolean not null default false,   -- anchor for current viewer
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.people (tree_id);
create index on public.people using gin (spouse_ids);
create index on public.people using gin (parent_ids);
create index on public.people using gin (child_ids);

-- ──────────────────────────────────────────────────────────────────────
-- invites: pending email invitations (user not yet signed up / not
-- yet matched to a Clerk account).
-- ──────────────────────────────────────────────────────────────────────
create type public.invite_status as enum ('pending', 'accepted', 'revoked');

create table public.invites (
  id              uuid primary key default gen_random_uuid(),
  tree_id         uuid not null references public.trees(id) on delete cascade,
  email           text not null,
  role            public.tree_role not null default 'viewer',
  status          public.invite_status not null default 'pending',
  invited_by      text not null,            -- Clerk user id of inviter
  token           text not null unique,     -- opaque, used in accept link
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz
);
create index on public.invites (tree_id);
create index on public.invites (email);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_people_updated_at before update on public.people
  for each row execute function public.touch_updated_at();
create trigger trg_trees_updated_at before update on public.trees
  for each row execute function public.touch_updated_at();
```

### Relationships as Arrays vs Join Table — Decision

**Decision: Keep arrays (as handoff specifies).**

| Aspect | Arrays on `people` (chosen) | Join table `relationships(a, b, kind)` |
|--------|----------------------------|----------------------------------------|
| Matches handoff model | Yes | No (would require a transform layer) |
| Single-row read for a person | Yes | No (join or separate query) |
| GIN index for array lookups | Yes (`spouse_ids @> '{id}'`) | Indexed columns |
| Write atomicity (symmetric rel) | One row updated; two rows for symmetric | Two inserts |
| Referential integrity | Soft (no FK on array elements) | Hard (FK enforced) |
| Scale concern | None at expected sizes (<500 people/tree) | None |

The handoff's `Person` shape is the contract the client was designed around. Storing relationships in arrays means the DB row shape ≈ the `Person` TS type — no translation layer. The downside (no FK on array elements) is manageable: server actions validate existence before writing, and `ON DELETE CASCADE` on `tree_id` handles tree deletion. For v1, arrays win.

**If we outgrow this (v2+):** Migrate to a `relationships(tree_id, a_id, b_id, kind)` table when any of these becomes true: (a) need for typed relationships beyond spouse/parent/child, (b) time-bounded relationships (marriages/divorces with dates), (c) large trees (10k+ people per tree).

### RLS Policies

```sql
alter table public.trees         enable row level security;
alter table public.tree_members  enable row level security;
alter table public.people        enable row level security;
alter table public.invites       enable row level security;

-- Helper: current Clerk user id from JWT sub claim.
-- With native Clerk integration, Supabase surfaces the Clerk-issued JWT
-- and auth.jwt()->>'sub' contains the Clerk user id.
create or replace function public.clerk_user_id()
returns text language sql stable as $$
  select auth.jwt()->>'sub';
$$;

-- ── trees ─────────────────────────────────────────────────────────────
-- SELECT: member of the tree OR link-sharing is enabled (anon read)
create policy "trees: select if member or link-shared"
  on public.trees for select
  using (
    link_share = true
    or exists (
      select 1 from public.tree_members tm
      where tm.tree_id = trees.id
        and tm.user_id = public.clerk_user_id()
    )
  );

-- INSERT: authenticated users can create trees (owner must be themselves)
create policy "trees: insert own"
  on public.trees for insert
  with check (owner_user_id = public.clerk_user_id());

-- UPDATE: owner or editor can rename; only owner can toggle link_share
create policy "trees: update by owner/editor"
  on public.trees for update
  using (
    exists (
      select 1 from public.tree_members tm
      where tm.tree_id = trees.id
        and tm.user_id = public.clerk_user_id()
        and tm.role in ('owner', 'editor')
    )
  );

-- DELETE: owner only
create policy "trees: delete by owner"
  on public.trees for delete
  using (owner_user_id = public.clerk_user_id());

-- ── tree_members ──────────────────────────────────────────────────────
create policy "tree_members: select if member of tree"
  on public.tree_members for select
  using (
    user_id = public.clerk_user_id()                -- you see your own membership
    or exists (                                      -- or any co-member on same tree
      select 1 from public.tree_members tm
      where tm.tree_id = tree_members.tree_id
        and tm.user_id = public.clerk_user_id()
    )
  );

-- INSERT/DELETE membership: only owner (share flow)
create policy "tree_members: owner manages"
  on public.tree_members for all
  using (
    exists (select 1 from public.trees t
            where t.id = tree_members.tree_id
              and t.owner_user_id = public.clerk_user_id())
  )
  with check (
    exists (select 1 from public.trees t
            where t.id = tree_members.tree_id
              and t.owner_user_id = public.clerk_user_id())
  );

-- ── people ────────────────────────────────────────────────────────────
-- SELECT: any member of the tree (or anon via link_share=true)
create policy "people: select if can access tree"
  on public.people for select
  using (
    exists (select 1 from public.trees t
            where t.id = people.tree_id
              and (
                t.link_share = true
                or exists (select 1 from public.tree_members tm
                           where tm.tree_id = t.id
                             and tm.user_id = public.clerk_user_id())
              ))
  );

-- INSERT/UPDATE/DELETE: editor or owner only
create policy "people: mutate if editor or owner"
  on public.people for all
  using (
    exists (select 1 from public.tree_members tm
            where tm.tree_id = people.tree_id
              and tm.user_id = public.clerk_user_id()
              and tm.role in ('owner', 'editor'))
  )
  with check (
    exists (select 1 from public.tree_members tm
            where tm.tree_id = people.tree_id
              and tm.user_id = public.clerk_user_id()
              and tm.role in ('owner', 'editor'))
  );

-- ── invites ───────────────────────────────────────────────────────────
-- Only owners see invites for their tree; invitee-by-email flow is
-- handled via a server-action + token lookup, not a public SELECT.
create policy "invites: owner sees"
  on public.invites for select
  using (
    exists (select 1 from public.trees t
            where t.id = invites.tree_id
              and t.owner_user_id = public.clerk_user_id())
  );

create policy "invites: owner manages"
  on public.invites for all
  using (
    exists (select 1 from public.trees t
            where t.id = invites.tree_id
              and t.owner_user_id = public.clerk_user_id())
  )
  with check (
    exists (select 1 from public.trees t
            where t.id = invites.tree_id
              and t.owner_user_id = public.clerk_user_id())
  );
```

**Why `auth.jwt()->>'sub'` and not `auth.uid()`:** The native Clerk-Supabase integration (recommended by Supabase since April 2025) passes Clerk's JWT directly to Supabase. The `sub` claim holds the Clerk user id (format `user_xxxxxxxxx`). `auth.uid()` is a Supabase-auth-specific helper that casts `sub` to UUID and fails for Clerk's string ids. We either (a) use `auth.jwt()->>'sub'` directly (shown above), or (b) create a helper `clerk_user_id()` function and use that in every policy — preferred for readability. Store Clerk user ids in `text` columns, never `uuid`.

**Performance note:** Wrap subqueries that reference `auth.jwt()` in `(select ...)` in production. Supabase documents that `(select public.clerk_user_id())` is evaluated once per query rather than per row. For v1 performance at expected scale, the straightforward policies above are fine; optimize if you hit query latency.

---

## Realtime Channel Shape

### Channel naming

One channel per open tree: `tree:${treeId}` (e.g. `tree:a3b1-...-8f9e`).

A user who has two trees open in two tabs subscribes to two channels — this is expected.

### Presence payload (tracked state per client)

```typescript
type PresenceState = {
  userId: string;          // Clerk user id
  displayName: string;     // for avatar tooltip
  avatarUrl: string | null;
  color: string;           // deterministic from userId; used for cursor tint
  selectedPersonId: string | null;   // optional: show "X is editing Mary"
  cursor?: { x: number; y: number }; // canvas-space coords; optional v1.x
};
```

**What presence drives:** Topbar avatar stack, optional "X is editing this node" indicator on nodes, optional remote cursors (v1.x; v1 ships avatars only per handoff).

### Broadcast events (from clients; server echoes not used)

All events share an envelope:

```typescript
type BroadcastEnvelope<T> = {
  type: T['type'];
  senderClientId: string;   // per-tab uuid; used to ignore own echoes
  senderUserId: string;     // Clerk user id
  treeId: string;
  ts: number;               // client timestamp (ms)
  payload: T;
};

type PersonUpdateEvent = {
  type: 'person_update';
  personId: string;
  patch: Partial<Person>;   // field-level patch; last-write-wins per field
};

type PersonMoveEvent = {
  type: 'person_move';
  personId: string;
  x: number;
  y: number;
  // Emitted during drag at ~30Hz; final position also goes through
  // server action + broadcast as 'person_update'.
};

type StructuralEvent = {
  type: 'structural';
  kind: 'add_relative' | 'remove_person';
  // Add: full new person + the patch to anchor's relationship arrays.
  // Remove: personId + patches to all referencing persons.
  newPerson?: Person;
  patches: Array<{ personId: string; patch: Partial<Person> }>;
};

type PresenceUpdateEvent = {
  type: 'presence_update';
  selectedPersonId: string | null;
};
```

### Event lifecycle

```
User types in SidePanel "Name" input
   │
   ▼
Zustand: updatePerson(id, { name }) applied locally (optimistic)
   │
   ├─→ debounce 300ms ─→ server action updatePersonAction()
   │                          │
   │                          ├─→ Postgres UPDATE (authed, RLS-checked)
   │                          │
   │                          └─→ on success: broadcast person_update on
   │                              tree:${treeId}
   │
   ▼
Peers receive broadcast, ignore if senderClientId === own clientId,
otherwise merge patch into their Zustand store.
```

**Key decisions:**

1. **Clients broadcast, server does not.** Simpler than Postgres-changes subscriptions; works cleanly with server actions that are the authoritative write path. Supabase's "Broadcast from Database" feature is available (v1.x enhancement) but adds complexity for v1.
2. **`self: false` (default).** Never receive own broadcasts; reduces echo-dedupe burden. Still send `senderClientId` as belt-and-suspenders in case of reconnect edge cases.
3. **Throttle `person_move` during drag.** Send at ~30Hz (every ~33ms), not every mousemove. Commit final position via `person_update` on mouseup (goes through server action → persists).
4. **Last-write-wins per field.** `patch` is field-level; two clients editing different fields merge cleanly. Two clients editing the same field — last arrival wins. Per PROJECT.md this is acceptable for v1.
5. **Structural events are idempotent-at-receiver.** When peer receives `add_relative`, it checks if the new person id already exists in its store before adding. Prevents double-add from reconnect replay.

### Authorization

With the native Clerk integration, Supabase Realtime honors the same RLS policies that apply to table reads. Channel subscription is authorized server-side: if the user's Clerk JWT doesn't satisfy `tree_members` membership for the tree, the subscribe will fail. No extra server code needed — just correct RLS.

---

## Clerk ↔ Supabase Integration

**Recommended approach (2026):** Native third-party auth integration — the legacy JWT-template approach was deprecated April 2025.

### Setup (one-time)

1. In Supabase Dashboard → Authentication → Sign In/Up → Third Party Auth → add Clerk, paste Clerk Domain.
2. In Clerk Dashboard → enable the "supabase" JWT integration checkbox (sets `role: authenticated` in issued tokens).
3. No secret sharing between services.

### Browser client

```typescript
// lib/supabase/browser.ts
'use client';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '@clerk/nextjs';

export function useSupabase() {
  const { getToken } = useAuth();
  return useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          accessToken: async () => (await getToken()) ?? null,
        },
      ),
    [getToken],
  );
}
```

### Server client (RSC + server actions)

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { auth } from '@clerk/nextjs/server';

export async function createServerSupabase() {
  const { getToken } = await auth();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { /* no cookie storage; token is explicit */ },
      accessToken: async () => (await getToken()) ?? null,
    },
  );
}
```

### Clerk user id mapping

- Store `user_id` / `owner_user_id` / `invited_by` as **`text`** (not `uuid`) — Clerk ids look like `user_2abcDEF...`.
- RLS reads from `auth.jwt()->>'sub'` (available because native integration passes the Clerk JWT through).
- No user-mirror table required for v1 — we don't need to join to "user profiles" anywhere. If we later need email/avatar server-side (e.g., to render invite lists with existing user avatars), add a thin `users` mirror table populated via a Clerk webhook (`app/api/webhooks/clerk/route.ts`).

---

## Data Flow

### Read flow (initial page load)

```
Browser → GET /tree/[treeId]
    ↓
Next.js RSC: app/(app)/tree/[treeId]/page.tsx
    ↓
auth() from @clerk/nextjs/server → getToken()
    ↓
createServerSupabase() → supabase.from('people').select('*').eq('tree_id', id)
    ↓ (Postgres enforces RLS via auth.jwt()->>'sub')
people[] returned to RSC
    ↓
<TreeView initialPeople={...} /> renders (client boundary)
    ↓
TreeStoreProvider creates per-request Zustand store, seeds people
    ↓
<Canvas>, <NodeLayer>, <EdgeLayer> subscribe to store; render immediately
    ↓
<RealtimeBridge> mounts; subscribes to tree:${treeId} channel; tracks presence
```

### Write flow (edit person name)

```
User types in SidePanel Name input
    ↓
onChange → store.updatePerson(id, { name }) [optimistic]
    ↓
UI reflects immediately; AutoSavePill flashes to "Saving..."
    ↓
debounce 300ms → updatePersonAction({ personId, patch }) [server action]
    ↓
Server action: createServerSupabase() → supabase.from('people').update({...}).eq(...)
    ↓ (RLS: user must be editor/owner)
Success → revalidatePath is NOT called (avoids nuking client state); return { ok: true }
    ↓
Store: lastSavedAt = Date.now(); AutoSavePill → "Saved" (green, 1.4s)
    ↓
Store: broadcast PersonUpdateEvent on tree:${treeId}
    ↓
Peer clients receive, merge patch → their UIs update
```

### Write flow (add relative — structural)

```
User clicks Parent slice on radial
    ↓
Store: addRelative(anchorId, 'parent')
   - Compute new person position (anchor.x, anchor.y - 120), collision-nudge if overlap
   - Mint new uid; insert into people
   - Update anchor.parentIds += newId; update newId.childIds += anchorId
   - Push full snapshot to history
    ↓ (optimistic; UI shows new node + edge immediately)
addRelativeAction({ treeId, anchorId, kind, newPerson })
    ↓
Server: INSERT new person + UPDATE anchor in a single transaction
    ↓
Broadcast StructuralEvent on tree:${treeId}
    ↓
Peers: check newPerson.id not already present, then apply patches + add person
```

### Drag flow (move node)

```
User mousedowns on node → store.beginDrag(id)
    ↓
mousemove (throttled ~60Hz for UI; ~30Hz for broadcast):
   - Local: update people[id].x/y
   - Broadcast: PersonMoveEvent (no server call)
    ↓
mouseup → store.endDrag(finalX, finalY)
   - Push snapshot to history
   - moveNodeAction({ personId, x, y }) → persists final position
   - Broadcast PersonUpdateEvent with {x, y} so late joiners get final state
```

---

## Server Action vs Client Mutation Decisions

| Operation | Path | Rationale |
|-----------|------|-----------|
| Create tree | Server action | One-time; needs to create tree + tree_members(owner) atomically |
| Rename tree | Server action | Infrequent; topbar inline-edit debounced |
| Update person (field edits) | Server action (debounced 300ms) + optimistic client | Most-common mutation; need persistence; optimistic for feel |
| Add relative (structural) | Server action + optimistic client | Must be atomic (person + two relationship patches) |
| Remove person (structural) | Server action + optimistic client | Must cascade relationship array cleanups atomically |
| Move node (drag) | Client broadcast during drag; server action on mouseup | Intermediate positions don't need to persist |
| Tidy layout | Server action (bulk update) + optimistic client | Affects many rows; single transaction preferred |
| Invite user | Server action | Generates token, writes invite, triggers email (post-v1 may enqueue job) |
| Accept invite | Server action | Token exchange → creates tree_members row |
| Toggle link-share | Server action | Owner-only; single trees row update |
| Presence track/untrack | Client (Realtime channel `.track()`) | Ephemeral; never persisted |

**Rule of thumb:** Any write that touches the DB → server action (RLS runs server-side; easier to audit; no anon-key-in-browser risk for mutations). Any ephemeral UI state (transforms, selection, radial open) → client-only Zustand. Any cross-client sync of ephemeral state → Realtime broadcast.

---

## Build Order (aligned with handoff steps 1–8)

Dependencies flow downward; each step unlocks the next.

```
1. Data model + auth foundation
   ├─ Clerk setup (sign-in pages, <ClerkProvider>, middleware)
   ├─ Supabase project + native Clerk integration
   ├─ Migrations: trees, tree_members, people, invites
   ├─ RLS policies enabled + tested
   └─ lib/supabase/{server,browser}.ts + createTree action
   ─── Acceptance: Sign in, create tree, see it in DB with correct owner. ───

2. Canvas + static nodes
   ├─ app/(app)/tree/[treeId]/page.tsx fetches people (RSC)
   ├─ <Canvas> pan/zoom (transform in Zustand)
   ├─ <NodeLayer> + <PersonNode> rendering at stored x/y
   ├─ TreeStoreProvider + createTreeStore factory
   └─ Design tokens in Tailwind config matching styles.css
   ─── Acceptance: Load a tree, see nodes at correct positions, pan/zoom feels native. ───
   (Requires: step 1)

3. Selection + SidePanel (edit flow)
   ├─ Click-to-select in NodeLayer
   ├─ <SidePanel> with Identity/Life/Relationships/Actions sections
   ├─ updatePerson server action + optimistic Zustand mutation
   ├─ <AutoSavePill> driven by lastSavedAt
   └─ Keyboard: Enter opens panel, Esc closes
   ─── Acceptance: Edit a person, field persists, pill flashes Saved. ───
   (Requires: steps 1, 2)

4. Edges (computeEdges + SVG render)
   ├─ lib/model/computeEdges.ts (pure, Vitest-covered)
   ├─ <EdgeLayer> rendering SVG paths under node layer
   └─ Edge routing: spouse horizontal, parent-child orthogonal
   ─── Acceptance: Sample tree renders with correct edges; editing relationships re-renders edges. ───
   (Requires: step 2)

5. Add relative + radial menu
   ├─ <RadialMenu> portal'd at anchor screen coords
   ├─ lib/model/collisionNudge.ts for new-node positioning
   ├─ addRelativeAction (atomic insert + relationship patches)
   └─ Selection moves to new node, panel auto-opens, name autofocused
   ─── Acceptance: Add parent/spouse/child/sibling from radial; persists; edges update. ───
   (Requires: steps 1, 2, 3, 4)

6. Undo/redo + history
   ├─ lib/model/history.ts — snapshot push/undo/redo
   ├─ ⌘Z / ⌘⇧Z / ⌘Y keybindings
   └─ Every structural change (add/remove/move/tidy) commits a snapshot
   ─── Acceptance: Undo/redo across add, edit, move, tidy. ───
   (Requires: steps 3, 5)

7. Tidy layout (dagre)
   ├─ lib/model/layoutTidy.ts wrapping dagre with couple-merge
   ├─ Toolbar ✨ button dispatches tidy → commits snapshot → bulk server update
   └─ Bulk update server action: trees-of-ids update in one request
   ─── Acceptance: Complex tree tidies into clean generations; undoable. ───
   (Requires: steps 4, 6)

8. Share modal + collaborators + Realtime
   ├─ <ShareModal> with invite / role / link-share
   ├─ invite / acceptInvite server actions (token flow)
   ├─ lib/realtime/{channel,events}.ts subscribe pipeline
   ├─ <PresenceAvatars> in topbar (presence_sync)
   ├─ Broadcast pipeline: person_update, person_move, structural
   └─ Optimistic echoes deduped via senderClientId
   ─── Acceptance: Two browsers on same tree see each other's edits + avatars live. ───
   (Requires: steps 1, 3, 5)

(v2) Sheets sync — deferred per PROJECT.md
```

**Parallelizable branches after step 2:**
- Step 3 (SidePanel) and step 4 (Edges) are independent — can be built in parallel.
- Step 7 (Tidy) only depends on step 4; can happen before step 5 if desired, but shipping value is better in the listed order.

**Shared test scaffolding (cross-cutting):**
- Vitest unit tests for `lib/model/*` start in step 1, grow with each step.
- Playwright E2E: one smoke (sign in → create tree → add person) after step 5; full flow + share after step 8.

---

## Scaling Considerations

| Scale | Adjustments |
|-------|-------------|
| 1–50 concurrent users across many trees | Default Supabase Realtime, default Postgres. No changes needed. |
| 50–500 concurrent editors on the same tree | Throttle broadcasts harder (person_move at 15Hz); batch structural events. Cap presence to most-recent-N viewers if needed. |
| 500+ concurrent per tree (not expected — families don't work like this) | Move to CRDT (Yjs/Automerge) for field-level merging; split structural ops into a server-mediated queue. Out of scope indefinitely. |
| 10k+ people per tree | Virtualize node layer (only render nodes within viewport + margin). Migrate relationships to join table for query perf. |

### Scaling Priorities (what breaks first)

1. **Canvas render perf with >500 visible nodes.** Fix: memoize `<PersonNode>` on shallow-equal; virtualize (cull nodes outside viewport) — well-understood React pattern.
2. **Realtime broadcast fan-out with >20 simultaneous editors per tree.** Fix: throttle move events; move to Postgres-changes subscription for structural so server mediates order.
3. **SidePanel autosave contention with rapid typing + flaky network.** Fix: request collapsing (cancel in-flight request on new input); already partly solved by 300ms debounce.

None of these are v1 concerns at target usage (a family, maybe 5–15 people editing one tree occasionally).

---

## Anti-Patterns

### Anti-Pattern 1: Module-scoped Zustand store in Next.js

**What people do:** `export const useStore = create<...>()(...)` at top level of a module, imported directly by components.

**Why it's wrong:** In Next.js SSR, modules are evaluated once and state is shared across requests — one user can see another user's store. Even on the client, this couples state to module lifecycle in ways that break when you later add multi-tenant views (e.g., two trees open side by side).

**Do this instead:** Store factory + Context Provider. Per-request instance. Official Zustand Next.js guide.

### Anti-Pattern 2: Storing edges in the database

**What people do:** Create an `edges` table and sync it on every relationship change.

**Why it's wrong:** Edges are a projection of `people[].{spouseIds, parentIds, childIds}`. Storing both creates two sources of truth that drift. The handoff explicitly specifies `computeEdges(people)`.

**Do this instead:** Derive edges client-side on every render (memoized on `people` identity). It's O(n) over a few hundred rows — trivially fast.

### Anti-Pattern 3: Using `auth.uid()` with Clerk

**What people do:** Copy-paste a Supabase-auth RLS tutorial using `auth.uid() = user_id`.

**Why it's wrong:** `auth.uid()` casts the JWT `sub` to a UUID. Clerk user ids are strings like `user_2abcXYZ` — the cast fails, and every policy silently rejects.

**Do this instead:** Use `auth.jwt()->>'sub'` (or a helper function). Store Clerk ids in `text` columns.

### Anti-Pattern 4: Broadcasting every mousemove during drag

**What people do:** Emit a realtime event on every mousemove (~120Hz on fast displays).

**Why it's wrong:** Blows realtime quotas, saturates peer handlers, makes the app feel *less* responsive (peer renders contend with local renders).

**Do this instead:** Throttle to ~30Hz during drag; send one authoritative `person_update` on mouseup that also persists via server action.

### Anti-Pattern 5: Relying on Realtime echoes for persistence

**What people do:** Write through Realtime broadcast only, persisting by listening on the server.

**Why it's wrong:** Broadcast is best-effort fire-and-forget. Missed events = data loss. Also bypasses RLS-style authorization (broadcast is client-emitted and trusted).

**Do this instead:** Server actions for persistence (authoritative, RLS-enforced). Realtime broadcast for UX-only sync of already-persisted (or in-flight-to-persist) changes.

### Anti-Pattern 6: Full tree reload on every mutation

**What people do:** `revalidatePath` after every `updatePerson`, then rely on RSC re-fetch to propagate.

**Why it's wrong:** Wipes client state (selection, transform, radial, panel open state). Feels laggy. Defeats the optimistic-mutation model.

**Do this instead:** Don't revalidate on in-canvas mutations. Apply optimistically to Zustand; let server action return `{ ok: true }`; trust the store as local truth until page navigation. Revalidate only on cross-page concerns (e.g., tree list after `createTree`).

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Clerk | `<ClerkProvider>` + `middleware.ts` for route protection; `auth()` in server code; `useAuth()` in client | Native Supabase integration — no JWT template config. Webhook for user events (post-v1). |
| Supabase Postgres | `@supabase/ssr` server + browser clients; Clerk token via `accessToken` option | RLS does all authz; server actions use authed client, not service role |
| Supabase Realtime | Same browser client; `channel('tree:${id}')` + `.on('broadcast', ...)` + `.on('presence', ...)` + `.track()` | Auth inherited from Supabase client |
| Vercel | Deploy Next.js; env vars for Clerk + Supabase | No special config beyond standard Vercel + Next.js 14 |
| Email (post-v1 for invites) | Resend or Clerk's built-in transactional for invite emails | V1 can ship with invite link shown in ShareModal, email optional |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| RSC pages ↔ server actions | Direct function call (typed) | Both use `createServerSupabase()`; share `lib/model/types.ts` |
| Server actions ↔ Postgres | Supabase client (`.from().select/insert/update/delete`) | RLS enforces authorization; server actions don't pass `user_id` manually — it's read from JWT |
| Client components ↔ Zustand | `useTreeStore(selector)` | Providers scope stores per tree view |
| Zustand ↔ Realtime bridge | `<RealtimeBridge>` client component subscribes on mount, dispatches store actions on incoming events | Keeps Realtime plumbing out of UI components |
| Canvas ↔ Node/Edge layers | Shared transform in Zustand; layers render inside transformed parent | One transform selector subscribed by Canvas root only; children use canvas-space coords |
| SidePanel ↔ selected person | Subscribe to `selectedId` → derive `selectedPerson` via selector | Avoids re-rendering panel on unrelated people mutations |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Clerk + Supabase native integration pattern | HIGH | Official Supabase + Clerk docs (2025–2026); widely adopted |
| RLS with `auth.jwt()->>'sub'` | HIGH | Confirmed in Supabase Clerk integration docs; deprecation notice for legacy JWT template |
| Zustand factory + provider for Next.js | HIGH | Official Zustand Next.js guide; long-documented pattern |
| Realtime channel-per-tree + broadcast shape | HIGH | Official Supabase Realtime docs; pattern is standard for collaborative canvas (Figma/whiteboard-like apps) |
| Derived edges (no edges table) | HIGH | Prescribed by handoff; matches app's data shape |
| Arrays vs join table | MEDIUM-HIGH | Arrays chosen to match handoff; tradeoffs documented; easy to migrate later |
| Server action vs client-mutation split | HIGH | Next.js 14 documented pattern; optimistic + server action is the recommended mutation flow |
| Dagre for Tidy | MEDIUM | Per PROJECT.md decision; couple-merge wrapper is a known pattern but implementation-specific testing needed in phase 7 |

---

## Sources

- [Clerk | Supabase Docs](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Integrate Supabase with Clerk | Clerk Docs](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [clerk/clerk-supabase-nextjs companion repo](https://github.com/clerk/clerk-supabase-nextjs)
- [How Clerk integrates with Supabase](https://clerk.com/blog/how-clerk-integrates-nextjs-supabase)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [JWT Claims Reference | Supabase Docs](https://supabase.com/docs/guides/auth/jwt-fields)
- [Realtime | Supabase Docs](https://supabase.com/docs/guides/realtime)
- [Broadcast | Supabase Docs](https://supabase.com/docs/guides/realtime/broadcast)
- [Presence | Supabase Docs](https://supabase.com/docs/guides/realtime/presence)
- [Realtime Broadcast and Presence Authorization](https://supabase.com/blog/supabase-realtime-broadcast-and-presence-authorization)
- [Setup with Next.js — Zustand](https://zustand.docs.pmnd.rs/learn/guides/nextjs)
- [Zustand SSR (DeepWiki)](https://deepwiki.com/pmndrs/zustand/6.1-server-side-rendering)
- [Data Fetching: Server Actions and Mutations | Next.js](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Optimistic Updates in Next.js 14 (useOptimistic + Server Actions)](https://dev.to/whoffagents/optimistic-updates-in-nextjs-14-useoptimistic-server-actions-and-automatic-rollback-5hbl)
- [PostgreSQL Family Tree Application Practices (Alibaba)](https://www.alibabacloud.com/blog/postgresql-family-tree-application-practices---graph-relation-storage-and-search_595037)
- [Modeling Hierarchical Tree Data in PostgreSQL](https://leonardqmarcq.com/posts/modeling-hierarchical-tree-data)

---
*Architecture research for: collaborative family-tree canvas app (Next.js 14 + Supabase + Clerk)*
*Researched: 2026-04-21*
