---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-22T10:11:14.195Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 7
  completed_plans: 5
  percent: 71
---

# STATE: CZ Family Tree

**Last updated:** 2026-04-22 (after plan 02-01 execution — Phase 2 data plumbing landed)

## Project Reference

- **Name:** CZ Family Tree (czfamtree)
- **Core value:** A person opens the app, sees their family on a clean canvas, and adds/edits relatives without friction. The canvas + radial-add loop must feel effortless.
- **Current focus:** Phase 02 — canvas-nodes-edit
- **Planning root:** `.planning/`

## Current Position

Phase: 02 (canvas-nodes-edit) — EXECUTING
Plan: 2 of 3 (01 complete)

- **Milestone:** v1 Launch
- **Phase:** 02 — Canvas, Nodes & Edit (in progress, 1/3 plans done)
- **Plan:** 01-01 → 01-04 complete (Phase 1). 02-01 complete — Phase 2 data plumbing (PersonPatchSchema strict, three Server Actions with RLS + (id, tree_id) defense-in-depth, computeEdges/spousePath/parentPath pure utilities, extended Zustand TreeState with Record<id, Person> + drag/save slices, Tailwind gender + save-state tokens, D-08 grooming)
- **Status:** Executing Phase 02
- **Progress:** [███████░░░] 71%

### Roadmap Overview

| Phase | Goal | Status |
|-------|------|--------|
| 1. Foundation | Signed-in user lands in own private tree with schema + RLS correct | Complete (4/4 plans done — awaiting verification) |
| 2. Canvas, Nodes & Edit | Pan/zoom canvas, PersonNode, SidePanel, trustworthy auto-save | In Progress (1/3 plans done — data plumbing landed; canvas + save pipeline next) |
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

### Plan execution metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-01 | 10min | 4 | 18 |
| 01-02 | 35min | 2 | 6 |
| 01-03 | 20min | 3 | 6 created + 1 modified |
| 01-04 | 18min | 3 | 15 created + 2 modified |
| 02-01 | 8min | 4 | 4 created + 3 modified + 2 deleted |

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

### Phase 02 Plan 01 decisions

- `PersonPatchSchema.strict()` rejects unknown keys — primary mitigation for threat T-02-01 (mass assignment); prevents client smuggling of tree_id, is_me, owner_user_id
- All three Server Actions scope mutations via `.eq('id', personId).eq('tree_id', treeId)` — defense-in-depth for T-02-02 (IDOR cross-tree writes) even though RLS is authoritative
- Error wrapping surfaces only `error.message` — `error.hint`, `error.details`, `error.code` never leak; prevents Postgres constraint text from reaching the client toast (T-02-04)
- `temporal()` wrapper preserved in the Zustand store but drag/edit setters do NOT register past-states yet — Phase 3 (HIST-01..05) wires undo/redo (D-06); prevents failed saves from polluting history
- D-05 pronouns migration dropped entirely — `pronouns text` already ships in the initial schema at `supabase/migrations/20260421000000_initial_schema.sql` L48; no 0002 migration created
- `computeEdges` ported verbatim from handoff `model.jsx` L45-62 with NODE_W/H overridden to 180/76 (REQ NODE-01) and the handoff's magic `+ 70` spouse y-offset replaced by honest `+ NODE_H / 2 = 38` (UI-SPEC §8)

### Open Questions / Todos

- **Phase 1 planning:** decide step-relations data model before schema freeze — accept `parent_ids ≤ 2` limitation OR promote to `relationships` table
- **Phase 4 planning:** empirically tune dagre `nodesep` / `ranksep` against 5+ fixture families (singleton, couple+children, remarriage chain, adoption, half-siblings)
- **Phase 5 planning:** deep research on Realtime channel lifecycle, Clerk token refresh timing, and RLS re-audit under sharing + viewer-role scenarios

### Blockers

None currently. User approval of the roadmap is the only gate to beginning Phase 1 planning.

## Session Continuity

### Last Session

- Executed Phase 2 Plan 01 (`/gsd-execute-phase 2`) — 4 tasks, sequential; two Rule-1 acceptance-criterion alignments (docblock comments pruned to pass grep assertions)
  - Task 1 TDD (RED `7415f7b`, GREEN `6aec2b6`): created `lib/graph/edges.test.ts` (16 it-blocks), `lib/schemas/person.ts` (PersonPatchSchema.strict + GenderSchema + toDbPatch camelCase→snake_case), `lib/graph/edges.ts` (NODE_W=180, NODE_H=76, computeEdges verbatim port from handoff model.jsx L45-62 with sorted-pair spouse dedupe, spousePath canonical+midnode fallback, parentPath orthogonal)
  - Task 2 (commit `6d05521`): created `app/actions/people.ts` — updatePerson, movePerson, removePerson Server Actions; all three call getUserIdOrThrow() at line 1 of body, scope via `.eq('id', personId).eq('tree_id', treeId)` (T-02-02 defense-in-depth), wrap errors with only `error.message` (T-02-04 leak prevention)
  - Task 3 (commit `7550bb5`): extended `lib/store/tree-store.ts` — added Person/SaveState/PersonRowDb types, personFromRow boundary conversion, people/sidePanelOpen/draggingPersonId/dragOrigin/saveStateByPersonId state, 10 setters; temporal() wrapper preserved but drag/edit setters do NOT register past-states yet (D-06 Phase 3 delegation); file kept as .ts (no JSX) via React.createElement provider
  - Task 4 (commit `1bf7778`): extended `app/globals.css` with `--gender-{m,f,x,u}` + `--save-{saved,error}-bg` in :root and `--color-*` in @theme; deleted `components/shell/SeedPersonNode.tsx` + `components/shell/GridBackground.tsx` (D-08); pruned imports + stale docblocks from `app/(app)/tree/[treeId]/page.tsx`; REQUIREMENTS.md CANV-01 56px→52px, CANV-02 8px/--ink-4→24px/--rule-soft; PROJECT.md Key Decisions row for D-08 pronouns note
  - `npx tsc --noEmit` clean; `npx next build` succeeded (5 routes, Compiled successfully in 2.1s); `npx vitest run` 16 passed + 3 skipped (RLS env-gated); phase-level grep 50 matches (threshold ≥20)
  - Duration: 8 min
  - Requirements marked complete: EDGE-01, DESIGN-01

### Next Session

Plan 02-01 is complete. Data plumbing ready for Wave 2:

1. **Plan 02-02** (canvas render): `<TreeCanvas>` + `<PanZoomWrapper>` + `<EdgeLayer>` + `<PersonNode>` + `<AvatarCircle>` — consumes `NODE_W`/`NODE_H`/`computeEdges`/`spousePath`/`parentPath` from `lib/graph/edges.ts`, subscribes to `useTreeStore(s => s.people[id])` for per-person selectors, mounts inside `app/(app)/tree/[treeId]/page.tsx` where the placeholder comment now sits.
2. **Plan 02-03** (save pipeline + side panel): `<SidePanel>` + field components + `<SavePill>` + `<SaveErrorToast>` + `useSaveQueue` hook — consumes `PersonPatchSchema`/`PersonPatch`/`toDbPatch` from `lib/schemas/person.ts` and `updatePerson`/`movePerson`/`removePerson` from `app/actions/people.ts`.
3. Phase 2 end: verify cross-user RLS isolation on people mutations (`updatePerson` under a shared tree as editor vs viewer — should fail for viewer).

### Context Notes

- Design handoff at `design_handoff_family_tree/` is a high-fidelity React/HTML prototype — treat colors, typography, and spacing as pixel-parity targets. Prototype code is not production.
- Granularity is **coarse** — expect 1–3 plans per phase. Do not over-decompose.
- Parallelization is enabled — Phase 4 and Phase 5 planning can overlap once Phase 3 is complete.
- Model profile is `quality`; tests enabled via Vitest (unit) + Playwright (E2E) per TEST-01 / TEST-02.
- Deployment target: Vercel with Clerk + Supabase env vars (DEP-01). Next.js pinned ≥ 16 (DEP-02) to close CVE-2025-29927.

---
*STATE.md is updated at every phase transition and session boundary.*
