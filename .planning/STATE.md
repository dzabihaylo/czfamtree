---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
last_updated: "2026-05-07T21:41:08.477Z"
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 7
  completed_plans: 7
  percent: 100
---

# STATE: CZ Family Tree

**Last updated:** 2026-04-22 (after plan 02-03 execution — Phase 2 save pipeline + side panel landed)

## Project Reference

- **Name:** CZ Family Tree (czfamtree)
- **Core value:** A person opens the app, sees their family on a clean canvas, and adds/edits relatives without friction. The canvas + radial-add loop must feel effortless.
- **Current focus:** Phase 02 — canvas-nodes-edit
- **Planning root:** `.planning/`

## Current Position

Phase: 02 (canvas-nodes-edit) — COMPLETE (awaiting verification)
Plan: 3 of 3 (01, 02, 03 complete)

- **Milestone:** v1 Launch
- **Phase:** 02 — Canvas, Nodes & Edit (3/3 plans done — awaiting phase verification)
- **Plan:** 01-01 → 01-04 complete (Phase 1). 02-01 complete — data plumbing (Zod strict PersonPatchSchema, Server Actions, computeEdges utility, extended store). 02-02 complete — canvas render (TreeStoreProvider wiring, TreeCanvas shell, PanZoomWrapper with pan/zoom/drag/Escape and movePerson persistence, EdgeLayer single-SVG with non-scaling-stroke, PersonNode 180×76 with all visual states, AvatarCircle 40px, useTreeStoreApi helper). 02-03 complete — save pipeline + side panel (useSaveQueue per-person serial queue, FieldInput/FieldTextarea/GenderSelect, RelationsList, SavePill 5-state, SaveErrorToast, 380px SidePanel with full Identity/Life/Relations/Actions/Footer structure, window.confirm-gated Remove hidden for is_me, queue hoisted to canvas level).
- **Status:** Phase 02 Complete (ready for verifier)
- **Progress:** [██████████] 100%

### Roadmap Overview

| Phase | Goal | Status |
|-------|------|--------|
| 1. Foundation | Signed-in user lands in own private tree with schema + RLS correct | Complete (4/4 plans done — awaiting verification) |
| 2. Canvas, Nodes & Edit | Pan/zoom canvas, PersonNode, SidePanel, trustworthy auto-save | Complete (3/3 plans done — awaiting verification) |
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
| 02-03 | 8min | 4 | 8 created + 1 modified |

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

### Phase 02 Plan 03 decisions

- `useSaveQueue` holds per-person slots in `useRef<Map<personId, PerPerson>>` — not React state — so no per-keystroke re-render of the hook consumer. All mutation to the PerPerson objects is synchronous inside hook callbacks.
- `runSave` finally-branch chains a new save only if `!e.inFlight` after the await resolves — structural SAVE-04 serial guarantee: two concurrent `updatePerson` Promises for the same personId are impossible. If new edits arrived while the save was in-flight, they land in `e.pending` and the finally branch starts a new chained save.
- Pill 'saved' → 'idle' 1400ms linger guarded by read-back check (`if saveStateByPersonId[id] === 'saved'`) — mirrors the Plan 02 drag-save pattern. A new edit that transitioned the pill to 'saving' or 'error' mid-linger is not clobbered.
- SaveErrorToast copy is person-level (`Couldn't save changes for {name}`) not field-level — useSaveQueue batches dirty fields into one patch per person; matches the drag-failure precedent; Plan 04 can refine if QA asks.
- Center-on-person is instant — UI-SPEC §Motion calls for a 300ms cubic-bezier tween, but Phase 2 transforms via setTransform state; a CSS transition would fight the pan-handler's continuous updates. Deferred to Phase 3 when layout animations land for Tidy.
- useSaveQueue hoisted to TreeCanvas (Task 4 refactor from Task 3's inline form) — one queue per tree survives panel open/close cycles so the 1400ms linger completes cleanly, AND SaveErrorToast can drive the same queue's retry from outside the panel.
- `enqueueMove` shipped in the SaveQueue API but unused by Phase 2 drag — PanZoomWrapper still calls `movePerson` directly because drag needs optimistic-revert-on-error which the generic queue doesn't implement. Exposed for future consumers.
- Field `commit(field, value)` funnel writes optimistic-local via `setPersonField` BEFORE enqueueing — PersonNode + EdgeLayer re-render with the new name/years/gender stripe immediately; the pill flips green only on server ACK (SAVE-02).

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

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260422-9vu | Fix Zustand unstable-selector bug + TreeSwitcher router.refresh hang + hydratePeople cross-tree leak | 2026-04-22 | 0c9549c | [260422-9vu-fix-zustand-unstable-selector-bug-wrap-o](./quick/260422-9vu-fix-zustand-unstable-selector-bug-wrap-o/) |

## Session Continuity

### Last Session — 2026-05-07 (Phase 3 discuss-phase resumed and completed)

**TL;DR:** Resumed Phase 3 discuss from the 2026-04-29 checkpoint (1/3 areas done, paused on undo failure UX). Confirmed UI-SPEC's drafted defaults for the in-flight question; deferred two Area-2 sub-questions and one Area-3 sub-question to planner discretion (with recommendations). Three Area-3 questions resolved in one batch. Phase 3 CONTEXT.md + DISCUSSION-LOG.md committed (`903877b`). Checkpoint cleaned up.

- Areas 1 + 2 + 3 all locked. CONTEXT.md captures 37 implementation decisions (D-01..D-37) including 8 explicit Claude's-discretion items with planner recommendations.
- Failure UX for inverse Server Action rejection: optimistic-local revert + per-person red pill + single `Couldn't sync history` toast (4400ms, Retry).
- Server action shape for Add-relative: single atomic `addPerson(treeId, kind, anchorId, position)` writing symmetric relations in one txn.
- Parent-cap edge case: server rejects → SaveErrorToast `Couldn't add parent — already has two`.
- Phase 3 'complete' gate is the full demo path (Playwright E2E + manual smoke + Vitest for pure utils).

### Next Session — run this exact command first

```
/clear
/gsd-plan-phase 3
```

Phase 3 plans should split coarsely (1-3 PLAN.md files). UI-SPEC §Component Inventory + CONTEXT.md D-30 suggest a natural split: (1) radial menu + add-relative pipeline + collision-nudge, (2) zundo wiring + history replay + toolbar + generic toast infra, (3) search palette + inline-undo Delete + a11y sweep. Planner has final call.

**Do not:**

- Auto-chain `/gsd-plan-phase 3` → `/gsd-execute-phase 3` in one TUI session. Plan phase prompts can be interactive.
- Try to clear Phase 2 HUMAN-UAT items before Phase 3 ships radial-add.
- Fix Phase 2 code-review warnings in the same session as Phase 3 planning. Keep `/gsd-code-review-fix 02` separate.

### Previous Session — 2026-04-29 (Phase 3 UI-SPEC + discuss-phase Areas 1+2 partial)

UI-SPEC authored, reviewed, revised once (Typography 4 sizes / 2 weights + aria-label fixes), and approved (`3f2b67e`). Discuss-phase started; Area 1 (boundary + demo path) locked; Area 2 paused mid-way on the inverse-Server-Action-rejection UX question. Checkpoint persisted at `03-DISCUSS-CHECKPOINT.json`.

### Previous Session — 2026-04-22 (full Phase 2 execute + verify + quick-fix + Phase 3 planning pause)

**TL;DR:** Phase 2 shipped code-complete, verified automated, HUMAN-UAT persisted but deferred. Quick-task 260422-9vu fixed 3 runtime bugs discovered at smoke-test. Phase 3 planning started but paused at UI-SPEC gate per user direction.

**Read `.planning/HANDOFF.md` for the full session handoff before running any command.**

- **Phase 2 execution** (3 waves sequential; worktree isolation fell back to sequential due to macOS case-insensitive path quirk — see HANDOFF.md):
  - Wave 1 / 02-01 — data plumbing: Zod schema, Server Actions, computeEdges, Zustand store extension, CSS tokens (commits `7415f7b`..`d101b7f`)
  - Wave 2 / 02-02 — canvas render: PanZoomWrapper, EdgeLayer single-SVG, PersonNode, AvatarCircle, TreeStoreProvider (commits `d9f784d`..`951bba7`)
  - Wave 3 / 02-03 — save pipeline + SidePanel: useSaveQueue, field primitives, SavePill, SaveErrorToast (commits `3ddfc56`..`366639f`)
- **Code review** (`02-REVIEW.md`, commit `7ee1b8c`): 0 critical, 6 warning, 5 info. Top issue: WR-01 literal `\u2014` in JSX text across SidePanel/SavePill/SaveErrorToast. Run `/gsd-code-review-fix 02` when ready.
- **Phase verification** (`02-VERIFICATION.md`): status `human_needed`. 7/7 automated must-haves pass, 37/37 requirements accounted for. 10 HUMAN-UAT items persisted to `02-HUMAN-UAT.md` (commit `e712bd4`) — all pending browser testing.
- **Quick task 260422-9vu** — three bug fixes found during smoke-test:
  - Zustand unstable selectors (`Object.keys(s.people)`) → infinite loop. Fixed with `useShallow` in PanZoomWrapper, restructured TreeCanvas to derive count outside selector (commit `eb5ca59`).
  - TreeSwitcher `handleCreate` called `router.refresh()` after `router.push()` in a React 19 async `startTransition` — left transition permanently pending, Next "rendering" indicator stuck, cursor spinning. Dropped the `refresh()` (commit `340d786`).
  - `hydratePeople` didn't reset `selectedPersonId` / `sidePanelOpen` / `draggingPersonId` / `dragOrigin` / `saveStateByPersonId` — stale per-person state leaked across tree switches. Reset all of them in the same set() (commit `0c9549c`).
- **Phase 3 planning paused** at the UI-SPEC gate. User chose **path B — full pipeline** (`/gsd-ui-phase 3` → `/gsd-discuss-phase 3` → `/gsd-plan-phase 3` → `/gsd-execute-phase 3`). Empty `.planning/phases/03-authoring-history/` created.

**User feedback about Phase 2 boundary:** the phase shipped a skeleton — canvas visible but no way to add anyone, "Getting Started" overlay undismissable, `+` button a no-op (Phase 3 wire-up). User said *"this doesn't feel like progress."* Apply in future phases: flag boundaries that don't enable a user loop BEFORE declaring completion, measure "done" by what the user can do not what tests pass, and name trade-offs explicitly. See HANDOFF.md for more detail.

### Next Session — run this exact command first

```
/gsd-ui-phase 3
```

Then (top-level, NOT nested — TUI prompts break in nested Task calls):

```
/gsd-discuss-phase 3
/gsd-plan-phase 3
/gsd-execute-phase 3
```

Phase 3 must ship radial-add (RAD-01..03 + ADD-01..04) before Phase 2 HUMAN-UAT becomes testable — most UAT items need a 2+ person tree.

**Do not:**

- Try to finish Phase 2 HUMAN-UAT in the next session. It's blocked by Phase 3.
- Auto-chain the three TUI commands above — they must run at the top level.
- Fix the 6 `02-REVIEW.md` warnings in the same session as Phase 3 planning. Keep polish separate.

### Context Notes

- Design handoff at `design_handoff_family_tree/` is a high-fidelity React/HTML prototype — treat colors, typography, and spacing as pixel-parity targets. Prototype code is not production.
- Granularity is **coarse** — expect 1–3 plans per phase. Do not over-decompose.
- Parallelization is enabled — Phase 4 and Phase 5 planning can overlap once Phase 3 is complete.
- Model profile is `quality`; tests enabled via Vitest (unit) + Playwright (E2E) per TEST-01 / TEST-02.
- Deployment target: Vercel with Clerk + Supabase env vars (DEP-01). Next.js pinned ≥ 16 (DEP-02) to close CVE-2025-29927.

---
*STATE.md is updated at every phase transition and session boundary.*
