---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-21T15:34:00Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 4
  completed_plans: 2
  percent: 50
---

# STATE: CZ Family Tree

**Last updated:** 2026-04-21 (after plan 01-02 execution)

## Project Reference

- **Name:** CZ Family Tree (czfamtree)
- **Core value:** A person opens the app, sees their family on a clean canvas, and adds/edits relatives without friction. The canvas + radial-add loop must feel effortless.
- **Current focus:** Phase 01 — foundation
- **Planning root:** `.planning/`

## Current Position

Phase: 01 (foundation) — EXECUTING
Plan: 2 of 4 complete; next is 01-03

- **Milestone:** v1 Launch
- **Phase:** 01 — Foundation (executing)
- **Plan:** 01-01 + 01-02 complete (scaffold + Clerk + Supabase + tokens + Zustand + cloud-applied schema + RLS + typed Database generic); 01-03 next (Clerk sign-in/sign-up pages + bootstrap server action + root redirect)
- **Status:** Executing Phase 01
- **Progress:** [█████░░░░░] 2 / 4 plans of Phase 1 done · 0 / 5 phases complete

### Roadmap Overview

| Phase | Goal | Status |
|-------|------|--------|
| 1. Foundation | Signed-in user lands in own private tree with schema + RLS correct | Executing (2/4 plans done) |
| 2. Canvas, Nodes & Edit | Pan/zoom canvas, PersonNode, SidePanel, trustworthy auto-save | Not started |
| 3. Authoring & History | Radial-add, undo/redo, toolbar, toasts, search, a11y | Not started |
| 4. Tidy & Layout | Dagre couple-merge layout with animated transition | Not started |
| 5. Share & Realtime | Share modal, Realtime presence + cursors + broadcast, deploy | Not started |

## Performance Metrics

Baseline targets (tracked once implementation begins):

| Metric | Target | Actual |
|--------|--------|--------|
| Canvas render (200 nodes + edges) | 60fps during pan/zoom | — |
| RLS p95 latency on `people.select` at 200 rows | < 100ms | — |
| Auto-save round-trip (field edit → server ACK → pill green) | < 500ms on broadband | — |
| Cursor broadcast throttle | ≤ 100ms (Supabase sweet spot) | — |
| Undo memory after 500 edits | < 50MB heap | — |

## Accumulated Context

### Key Decisions (from PROJECT.md)

- Next.js 16 App Router + React 19 + TS + Tailwind v4 (Clerk 7 requires this)
- Clerk 7 + Supabase **native** third-party auth (NOT the deprecated JWT template)
- RLS uses `auth.jwt()->>'sub'` (Clerk `sub` is text, never cast via `auth.uid()`)
- `@dagrejs/dagre@3.x` (scoped, maintained) — NOT unscoped `dagre@0.8.5`
- Zustand 5 + zundo 2 + immer 11 (patch-based history, not full snapshots)
- Custom CSS transform for pan/zoom (~120 LOC, no library)
- Edges **derived** from `people[].spouseIds/parentIds/childIds` — never stored
- Relationships as arrays on `people` (NOT a join table) for v1 — pending Phase 1 decision on step-relations
- Last-write-wins per field (no CRDT)
- One Realtime channel per tree: `tree:${treeId}` (presence + broadcast multiplexed)
- Optimistic-local + authoritative-server + reconcile-via-Realtime-broadcast (not Postgres CDC)
- Ship handoff steps 1–8 as v1 (Share included); Google Sheets sync deferred to v2

### Open Questions / Todos

- **Phase 1 planning:** decide step-relations data model before schema freeze — accept `parent_ids ≤ 2` limitation OR promote to `relationships` table
- **Phase 4 planning:** empirically tune dagre `nodesep` / `ranksep` against 5+ fixture families (singleton, couple+children, remarriage chain, adoption, half-siblings)
- **Phase 5 planning:** deep research on Realtime channel lifecycle, Clerk token refresh timing, and RLS re-audit under sharing + viewer-role scenarios

### Blockers

None currently. User approval of the roadmap is the only gate to beginning Phase 1 planning.

## Session Continuity

### Last Session

- Executed Phase 1 Plan 02 (`/gsd-execute-phase 1`) — Task 1 + Task 2
  - Task 1 (prior session, commit `aa89764`): wrote `supabase/migrations/20260421000000_initial_schema.sql` (4 tables, 4 enums, CHECK constraints, GIN indexes, unique partial index, 16 RLS policies all with `(select auth.jwt()->>'sub')` wrapping, FORCE RLS on all tables, `user_tree_ids()` SECURITY DEFINER helper, `creates_parent_cycle()` cycle detector, `bootstrap_tree()` RPC with in-body sanity check) + `supabase/seed.sql`
  - User ran `supabase db push` — migration applied successfully to Supabase project `nlnumavvjjgcdpwuziui` (czfamtree); pgcrypto NOTICE skipped
  - Task 2 (this session, commit `be3e552`): regenerated `lib/supabase/types.ts` from live cloud schema (381 lines, `Database` generic with 4 Tables + 4 Enums + 3 Functions); upgraded `lib/supabase/server.ts` and `lib/supabase/browser.ts` to `createClient<Database>(...)`; wrote `tests/rls.spec.ts` with 3 env-gated smoke tests
  - `npx tsc --noEmit` passes clean
  - Duration: ~35 min total (Task 1 ~25 min prior, Task 2 ~12 min this session)
  - No deviations in Task 2 — plan executed as written
  - Deferred: RLS smoke test EXECUTION — `.env.local` not yet populated. Suite is written, typechecks, gated on env vars; runs as soon as user fills in Clerk + Supabase anon keys.

### Next Session

Run `/gsd-execute-phase 1` again to execute Plan 01-03 (Clerk SignIn/SignUp pages + split-50/50 auth layout + SVG illustration + bootstrap server action + root redirect). Plan 01-03 imports the `Database` generic from `lib/supabase/types.ts` and calls the `bootstrap_tree` RPC. Plan 01-04 (authenticated shell) can run after 01-03. Before executing, user should populate `.env.local` so RLS smoke test can be run manually with `npx dotenv-cli -e .env.local -- npx vitest run tests/rls.spec.ts` (expected: 3 pass).

### Context Notes

- Design handoff at `design_handoff_family_tree/` is a high-fidelity React/HTML prototype — treat colors, typography, and spacing as pixel-parity targets. Prototype code is not production.
- Granularity is **coarse** — expect 1–3 plans per phase. Do not over-decompose.
- Parallelization is enabled — Phase 4 and Phase 5 planning can overlap once Phase 3 is complete.
- Model profile is `quality`; tests enabled via Vitest (unit) + Playwright (E2E) per TEST-01 / TEST-02.
- Deployment target: Vercel with Clerk + Supabase env vars (DEP-01). Next.js pinned ≥ 16 (DEP-02) to close CVE-2025-29927.

---
*STATE.md is updated at every phase transition and session boundary.*
