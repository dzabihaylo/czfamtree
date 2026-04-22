---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-22T10:26:39.807Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 7
  completed_plans: 6
  percent: 86
---

# STATE: CZ Family Tree

**Last updated:** 2026-04-22 (after plan 02-02 execution — Phase 2 canvas render landed)

## Project Reference

- **Name:** CZ Family Tree (czfamtree)
- **Core value:** A person opens the app, sees their family on a clean canvas, and adds/edits relatives without friction. The canvas + radial-add loop must feel effortless.
- **Current focus:** Phase 02 — canvas-nodes-edit
- **Planning root:** `.planning/`

## Current Position

Phase: 02 (canvas-nodes-edit) — EXECUTING
Plan: 3 of 3 (01, 02 complete)

- **Milestone:** v1 Launch
- **Phase:** 02 — Canvas, Nodes & Edit (in progress, 2/3 plans done)
- **Plan:** 01-01 → 01-04 complete (Phase 1). 02-01 complete — data plumbing (Zod strict PersonPatchSchema, Server Actions, computeEdges utility, extended store). 02-02 complete — canvas render (TreeStoreProvider wiring, TreeCanvas shell, PanZoomWrapper with pan/zoom/drag/Escape and movePerson persistence, EdgeLayer single-SVG with non-scaling-stroke, PersonNode 180×76 with all visual states, AvatarCircle 40px, useTreeStoreApi helper).
- **Status:** Executing Phase 02
- **Progress:** [█████████░] 86%

### Roadmap Overview

| Phase | Goal | Status |
|-------|------|--------|
| 1. Foundation | Signed-in user lands in own private tree with schema + RLS correct | Complete (4/4 plans done — awaiting verification) |
| 2. Canvas, Nodes & Edit | Pan/zoom canvas, PersonNode, SidePanel, trustworthy auto-save | In Progress (2/3 plans done — data plumbing + canvas render landed; save pipeline + side panel next) |
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
| 02-02 | 35min | 4 | 5 created + 4 modified |

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

### Phase 02 Plan 02 decisions

- `DragStateContext` (exported from `PanZoomWrapper.tsx`) carries a `MutableRefObject<DragState | null>` that `<PersonNode>` seeds on mousedown BEFORE calling `setSelectedPersonId`. Window-level `mousemove` enforces the 3px threshold; bare click-and-release never crosses the threshold, so selection is orthogonal to drag-save.
- `useTreeStoreApi()` helper landed in `lib/store/tree-store.ts` (originally scoped to Plan 01 per the 02-02 PLAN). First consumer is the drag-end `movePerson` commit in `PanZoomWrapper` — reads `storeApi.getState().people[id]` so the final position captured on mouseup is fresh even though the window listener closed over an earlier render. Plan 03's `useSaveQueue` will also consume it.
- Pill "saved" → "idle" 1400ms dwell guarded by a read-back check — the `setTimeout` callback verifies `saveStateByPersonId[id] === 'saved'` before stepping back to `'idle'` so a concurrent edit that transitions to `'saving'` or `'error'` during the dwell is not clobbered.
- `TreeCanvas` accepts a narrower `TreeCanvasPersonRow = Omit<PersonRowDb, 'created_at' | 'tree_id' | 'updated_at'>` prop type matching the RSC's actual SELECT shape — avoids forcing the RSC to over-fetch just to satisfy prop types.
- `data-node` / `data-sidepanel` / `data-topbar` attribute selectors replace handoff classnames for the pan-gate probe in `PanZoomWrapper` (Shared Pattern 7) — keeps the wrapper decoupled from downstream component styling.
- Wheel listener registered via `addEventListener('wheel', ..., { passive: false })` inside `useEffect` — React 17+ marks the synthetic `onWheel` passive, which blocks `e.preventDefault()` (required by CANV-04 to stop the browser's default scroll-page behavior under ⌘/Ctrl-scroll).
- Phase 2 does NOT engage zundo temporal for drag — `pastStates.push` is never invoked (D-06). Phase 3 HIST-05 wires history.

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

- Executed Phase 2 Plan 02 (`/gsd-execute-phase 2`) — 4 tasks, sequential; two Rule-3 blocking deviations both anticipated by the plan itself (narrower TreeCanvas prop type + Task 1 EdgeLayer/PersonNode stubs)
  - Task 1 (commit `d9f784d`): wrapped `app/(app)/layout.tsx` with `<TreeStoreProvider>`; widened `app/(app)/tree/[treeId]/page.tsx` people SELECT to all Phase 2 columns and mounted `<TreeCanvas tree={tree} people={peopleList} />`; added `data-topbar` to `components/shell/TopBar.tsx`; created `components/canvas/TreeCanvas.tsx` (hydrates store on `[tree.id]` dep), `components/canvas/PanZoomWrapper.tsx` (pan + cursor-anchored wheel zoom clamped `[0.25, 4]` @ sensitivity 0.0015 + two-finger trackpad pan + Escape deselect, wheel listener via `addEventListener` with `{ passive: false }`), stub `EdgeLayer.tsx` + stub `PersonNode.tsx`
  - Task 2 (commit `d1acc60`): filled `components/canvas/EdgeLayer.tsx` — single `<svg>` with `overflow: 'visible'`, `pointerEvents: 'none'`, non-scaling-stroke on every path (REQ EDGE-05), O(1) `peopleRecord[id]` lookups; filled `components/canvas/AvatarCircle.tsx` — 40px circle with `hashUserIdToColor(personId)` background
  - Task 3 (commit `718eab3`): extended `PanZoomWrapper.tsx` with `DragStateContext` (MutableRefObject shared with `<PersonNode>`), 3px threshold drag branch in window mousemove (deltas divided by `transform.k`), drag-end `movePerson(treeId, id, x, y)` commit with pill `idle → saving → saved (1400ms) → idle` (read-back guarded) and optimistic revert + pill `'error'` on failure; added `useTreeStoreApi()` helper to `lib/store/tree-store.ts`
  - Task 4 (commit `3e7900c`): filled `components/canvas/PersonNode.tsx` — 180×76 card with `data-node`/`role="button"`/`aria-pressed`/`tabIndex={0}`, 4px gender stripe (`--gender-{m,f,x,u}`), `<AvatarCircle>`, name + years copy per UI-SPEC, selection shadow `0 0 0 2px --accent, 4px 4px 0 --accent`, dragging shadow `6px 6px 0 --ink` + z-index 100, is-me `YOU` ribbon, selected-only `+` button (28×28, `--accent` bg, `2px 2px 0 --ink` shadow, `Plus` from lucide, Phase 3 no-op); narrow per-person store selectors (D-10)
  - `npx tsc --noEmit` clean; `npx next build` succeeded (5 routes, Compiled successfully in 1882ms); `npx vitest run` 16 passed + 3 skipped (unchanged); `grep dangerouslySetInnerHTML` in canvas/actions/(app) = 0 matches; `grep 'useTreeStore\(s => s\.people\)'` in PersonNode = 0 matches (narrow selectors enforced)
  - Duration: 35 min
  - Requirements marked complete: CANV-01..06, NODE-01..06, EDGE-02..06, SEL-01, SEL-02, DESIGN-01, DESIGN-02

### Next Session

Plan 02-02 is complete. Canvas render is live; Plan 02-03 (save pipeline + side panel) is the last Phase 2 wave:

1. **Plan 02-03** (save pipeline + side panel): `<SidePanel>` + field components + `<SavePill>` + `<SaveErrorToast>` + `useSaveQueue` hook — consumes `PersonPatchSchema`/`PersonPatch`/`toDbPatch` from `lib/schemas/person.ts`, `updatePerson`/`movePerson`/`removePerson` from `app/actions/people.ts`, and this plan's `DragStateContext` + `useTreeStoreApi`. PersonNode already calls `setSidePanelOpen(true)` on double-click + Enter — `<SidePanel>` just needs to subscribe to `sidePanelOpen` + `selectedPersonId`.
2. Phase 2 end: verify cross-user RLS isolation on people mutations (`updatePerson` under a shared tree as editor vs viewer — should fail for viewer).

### Context Notes

- Design handoff at `design_handoff_family_tree/` is a high-fidelity React/HTML prototype — treat colors, typography, and spacing as pixel-parity targets. Prototype code is not production.
- Granularity is **coarse** — expect 1–3 plans per phase. Do not over-decompose.
- Parallelization is enabled — Phase 4 and Phase 5 planning can overlap once Phase 3 is complete.
- Model profile is `quality`; tests enabled via Vitest (unit) + Playwright (E2E) per TEST-01 / TEST-02.
- Deployment target: Vercel with Clerk + Supabase env vars (DEP-01). Next.js pinned ≥ 16 (DEP-02) to close CVE-2025-29927.

---
*STATE.md is updated at every phase transition and session boundary.*
