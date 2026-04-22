---
phase: 02-canvas-nodes-edit
plan: 02
subsystem: canvas-render
tags: [phase-2, react-client, zustand, pan-zoom, drag, svg-edges, lucide, tailwind-arbitrary-values]
requires:
  - "Plan 02-01 exports: useTreeStore, TreeStoreProvider, personFromRow, Person, PersonRowDb, setters (hydratePeople, setTreeId, setSelectedPersonId, setSidePanelOpen, setTransform, setPersonPosition, setDragging, setSaveState)"
  - "Plan 02-01 graph utilities: NODE_W=180, NODE_H=76, computeEdges, spousePath, parentPath"
  - "Plan 02-01 Server Action: movePerson(treeId, id, x, y)"
  - "Phase 1: TopBar (52px locked), EmptyTreeOverlay, Avatar (32px reference), cn() / hashUserIdToColor / initialsFromName utilities"
  - "Phase 1: Tailwind v4 @theme block with Phase 2 gender + save-state tokens"
provides:
  - "components/canvas/TreeCanvas.tsx — client root that hydrates store from RSC-fetched rows and mounts PanZoomWrapper + EmptyTreeOverlay"
  - "components/canvas/PanZoomWrapper.tsx — pan, cursor-anchored wheel zoom [0.25, 4], two-finger trackpad pan, drag (3px threshold), drag-end movePerson persistence with optimistic revert, Escape deselect"
  - "components/canvas/EdgeLayer.tsx — single <svg> overlay with non-scaling-stroke paths for spouse (2px --accent) + parent (1.5px --ink) edges"
  - "components/canvas/PersonNode.tsx — 180x76 card: avatar + gender stripe + name + years + is-me YOU ribbon + selection + drag start + + button"
  - "components/canvas/AvatarCircle.tsx — 40px circle with ID-hashed background color"
  - "DragStateContext (exported from PanZoomWrapper.tsx) — context the child PersonNode uses to seed drag state on mousedown"
  - "useTreeStoreApi() (added to lib/store/tree-store.ts) — raw StoreApi accessor for imperative getState reads inside event handlers"
affects:
  - "app/(app)/layout.tsx (wrapped with TreeStoreProvider)"
  - "app/(app)/tree/[treeId]/page.tsx (widened select + <TreeCanvas> mount)"
  - "components/shell/TopBar.tsx (added data-topbar attribute)"
  - "lib/store/tree-store.ts (added useTreeStoreApi helper)"
tech-stack:
  added: []
  patterns:
    - "DragStateContext: React Context carrying a MutableRefObject that child nodes seed on mousedown and the parent wrapper's window listeners consume — avoids prop-drilling drag callbacks"
    - "Narrow per-person Zustand selectors via s.people[personId] (D-10) so drag-move re-renders only the dragged node, not the full list"
    - "storeApi.getState() inside window listeners (via useTreeStoreApi) to read final position without closure staleness"
    - "Wheel listener registered via addEventListener('wheel', ..., { passive: false }) inside useEffect (React 17+'s synthetic onWheel is passive — blocks preventDefault)"
    - "data-node / data-sidepanel / data-topbar attribute selectors replace handoff classnames for pan-gate probes (Shared Pattern 7 decoupling)"
key-files:
  created:
    - "components/canvas/TreeCanvas.tsx"
    - "components/canvas/PanZoomWrapper.tsx"
    - "components/canvas/EdgeLayer.tsx"
    - "components/canvas/PersonNode.tsx"
    - "components/canvas/AvatarCircle.tsx"
  modified:
    - "app/(app)/layout.tsx"
    - "app/(app)/tree/[treeId]/page.tsx"
    - "components/shell/TopBar.tsx"
    - "lib/store/tree-store.ts"
decisions:
  - "DragStateContext exported from PanZoomWrapper (child-writes / parent-reads via a shared MutableRefObject). PersonNode seeds the ref inside its mousedown BEFORE the select setter so a bare click-and-release always stays below the 3px threshold and the select-only path is orthogonal to the drag-persist path."
  - "useTreeStoreApi() landed in this plan (originally scoped to 02-01 per the PLAN spec). First consumer is the drag-end commit in PanZoomWrapper — it reads `storeApi.getState().people[id]` so the final position captured on mouseup is fresh even though the window listener closed over an earlier render. Plan 03's useSaveQueue will also consume it."
  - "TreeCanvas accepts a narrower TreeCanvasPersonRow type (Omit<PersonRowDb, 'created_at' | 'tree_id' | 'updated_at'>) matching what the RSC actually selects — avoids forcing the RSC to over-fetch just to satisfy prop types."
  - "Pill 'saved' → 'idle' dwell 1400ms gated by a read-back check (storeApi.getState().saveStateByPersonId[id] === 'saved'). A new save that transitions the pill to 'saving' or 'error' during the dwell is not clobbered."
  - "Phase 2 does NOT engage zundo temporal for drag — drag commits to the server via movePerson but `pastStates.push` is never invoked (D-06). Phase 3 HIST-05 wires history."
metrics:
  duration: "35min"
  completed: "2026-04-22"
  tasks: 4
  files_created: 5
  files_modified: 4
requirements-completed:
  - CANV-01
  - CANV-02
  - CANV-03
  - CANV-04
  - CANV-05
  - CANV-06
  - NODE-01
  - NODE-02
  - NODE-03
  - NODE-04
  - NODE-05
  - NODE-06
  - EDGE-02
  - EDGE-03
  - EDGE-04
  - EDGE-05
  - EDGE-06
  - SEL-01
  - SEL-02
  - DESIGN-01
  - DESIGN-02
---

# Phase 02 Plan 02: Canvas Render Summary

**One-liner:** Canvas pan/zoom/drag shell landed — TreeStoreProvider wraps the authenticated shell, the RSC widens its people select and mounts `<TreeCanvas>`, `<PanZoomWrapper>` owns pan (mousedown + window move/up), cursor-anchored wheel zoom clamped `[0.25, 4]` at sensitivity 0.0015, two-finger trackpad pan, 3px-threshold drag with drag-end `movePerson` persistence + optimistic revert on error, Escape deselect, single-`<svg>` `<EdgeLayer>` with non-scaling-stroke derived from Plan 01's `computeEdges`, and `<PersonNode>` 180×76 cards with gender stripe, `<AvatarCircle>` 40px, is-me YOU ribbon, selection state (`0 0 0 2px --accent, 4px 4px 0 --accent`), dragging state (`6px 6px 0 --ink`), and a selected `+` button wired to a Phase 3-handoff no-op.

## Performance

- **Duration:** 35 min
- **Tasks:** 4
- **Files created:** 5
- **Files modified:** 4
- **Commits:** 4 task commits (one per task)

## Tasks Landed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | TreeStoreProvider wiring + RSC widened select + TreeCanvas shell + PanZoomWrapper (pan + wheel + Escape) + EdgeLayer/PersonNode stubs | `d9f784d` |
| 2 | EdgeLayer single-SVG overlay + AvatarCircle 40px | `d1acc60` |
| 3 | PanZoomWrapper drag branches + `movePerson` persistence + `useTreeStoreApi` helper | `718eab3` |
| 4 | PersonNode 180×76 card with all visual states (selection, dragging, is-me) | `3e7900c` |

## Exports Plan 02-03 Can Now Import

### From `components/canvas/PanZoomWrapper.tsx`

```tsx
import PanZoomWrapper, { DragStateContext, type DragState } from '@/components/canvas/PanZoomWrapper';
```

- `DragStateContext` — React context exposing `dragStateRef` to descendants (PersonNode already consumes it)
- `DragState` type — `{ id, startX, startY, origX, origY }`

### From `components/canvas/TreeCanvas.tsx`

```tsx
import TreeCanvas, { type TreeCanvasPersonRow } from '@/components/canvas/TreeCanvas';
```

- `TreeCanvasPersonRow` — `Omit<PersonRowDb, 'created_at' | 'tree_id' | 'updated_at'>` — the shape the tree-route RSC actually returns

### From `lib/store/tree-store.ts` (carry-in from 02-01)

```tsx
import { useTreeStoreApi } from '@/lib/store/tree-store';
// Usage inside an event handler:
const storeApi = useTreeStoreApi();
const person = storeApi.getState().people[id];
```

## Files Created/Modified

- `components/canvas/TreeCanvas.tsx` — client root; hydrates store on mount with `[tree.id]` dep; mounts `<PanZoomWrapper>` + conditional `<EmptyTreeOverlay>`
- `components/canvas/PanZoomWrapper.tsx` — pan / wheel-zoom / drag / Escape. Exports `DragStateContext`
- `components/canvas/EdgeLayer.tsx` — single SVG overlay, `overflow: 'visible'`, `pointerEvents: 'none'`, non-scaling-stroke
- `components/canvas/PersonNode.tsx` — 180×76 card with avatar, gender stripe, years, YOU ribbon, + button
- `components/canvas/AvatarCircle.tsx` — 40px circle with ID-hashed background
- `app/(app)/layout.tsx` — wrapped children with `<TreeStoreProvider>`
- `app/(app)/tree/[treeId]/page.tsx` — widened people SELECT to all Phase 2 columns; mounts `<TreeCanvas>`
- `components/shell/TopBar.tsx` — added `data-topbar` attribute
- `lib/store/tree-store.ts` — added `useTreeStoreApi()` helper

## Decisions Made

- **DragStateContext via MutableRefObject** rather than prop-drilling `onStartDrag` or using a global DOM event. PersonNode seeds the ref on mousedown; PanZoomWrapper's window mousemove consumes it. Bare click-and-release never crosses the 3px threshold, so selection is orthogonal to drag-save.
- **`useTreeStoreApi()` landed here** (was originally scoped to Plan 01 per the 02-02 PLAN `<action>` block). First consumer is the `movePerson` drag-end commit — `storeApi.getState().people[id]` reads the fresh post-mutation position without closure staleness.
- **Pill dwell 1400ms guarded by read-back.** The `setTimeout` callback checks `saveStateByPersonId[id] === 'saved'` before stepping back to `'idle'` so a concurrent edit that transitions to `'saving'` or `'error'` during the dwell is not clobbered.
- **Narrow TreeCanvasPersonRow** — mirrors the RSC's actual select shape so prop types don't force over-fetching.
- **Phase 2 does NOT engage zundo temporal for drag.** `pastStates.push` is never invoked (D-06). Phase 3 HIST-05 wires history.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Narrowed TreeCanvas prop type to match RSC select**
- **Found during:** Task 1 (`npx tsc --noEmit`)
- **Issue:** The plan specified `people: PersonRowDb[]` on `<TreeCanvas>`, but the RSC select omits `created_at`, `tree_id`, `updated_at` to keep the payload lean. TS 2322: structural mismatch.
- **Fix:** Introduced `TreeCanvasPersonRow = Omit<PersonRowDb, 'created_at' | 'tree_id' | 'updated_at'>` on `TreeCanvas`, cast to `PersonRowDb[]` inside the `hydratePeople` call (structurally safe — `personFromRow` only reads the narrower field set).
- **Files modified:** `components/canvas/TreeCanvas.tsx`
- **Verification:** `npx tsc --noEmit` exits 0
- **Commit:** `d9f784d` (Task 1)

**2. [Rule 3 - Blocking] Created EdgeLayer / PersonNode stubs in Task 1 so `npx next build` passes**
- **Found during:** Task 1 (`<acceptance_criteria>` requires `npx next build` to exit 0, but PanZoomWrapper imports both components)
- **Issue:** The plan's own acceptance criterion acknowledges this: "stub EdgeLayer/PersonNode files may not exist yet — if build fails due to missing modules, create empty stub default exports". Not a true deviation, but flagging for audit.
- **Fix:** Created placeholder default-export components that return `null`; replaced in Tasks 2 and 4.
- **Files modified:** `components/canvas/EdgeLayer.tsx`, `components/canvas/PersonNode.tsx` (both fully filled later)
- **Verification:** `npx next build` exits 0 after Task 1
- **Commit:** `d9f784d` (Task 1), `d1acc60` (Task 2 fills EdgeLayer), `3e7900c` (Task 4 fills PersonNode)

---

**Total deviations:** 2 auto-fixed (2 Rule 3 blocking).
**Impact on plan:** Both were anticipated — the plan's Task 1 acceptance criterion explicitly authorized the EdgeLayer / PersonNode stubs, and the RSC-column / prop-type mismatch was a structural compatibility check that the plan's prose didn't foresee. No scope creep.

## Authentication Gates

None. All four tasks were pure-code — no env vars, OAuth flows, or interactive CLI auth required.

## Threat Model Verification

Every threat in the plan's STRIDE register is addressed:

| Threat | Disposition | Verified by |
|--------|-------------|-------------|
| T-02-07 DoS (infinite drag re-render) | mitigate | `PersonNode` uses narrow per-person selectors (`useTreeStore(s => s.people[personId])`). `grep -nE "useTreeStore\(s => s\.people\)" components/canvas/PersonNode.tsx` returns zero — no broad subscription leaked through. |
| T-02-08 Tampering (client x/y for other trees) | mitigate (Plan 01) | Unchanged — this plan only consumes `movePerson`. |
| T-02-09 prefers-reduced-motion | accept | Wheel-zoom gesture is user-driven. |
| T-02-10 XSS through names / pronouns | mitigate | `grep -rE "dangerouslySetInnerHTML" components/canvas/ app/\(app\)/ app/actions/` returns zero. All person text rendered as React children (auto-escaped). |

## Verification Results

```text
npx tsc --noEmit                                                        → exit 0
npx next build                                                          → exit 0 (5 routes, Compiled successfully in 1882ms)
npx vitest run                                                          → 16 passed, 3 skipped (RLS env-gated), exit 0
grep -rE "dangerouslySetInnerHTML" components/canvas/ app/\(app\)/ app/actions/  → no matches
grep -nE "useTreeStore\(s => s\.people\)" components/canvas/PersonNode.tsx       → no matches
```

## Known Stubs

- **PersonNode `+` button** — visible when selected, click is a no-op that logs `[Phase 3] radial open for {id}`. Phase 3 RAD-01 wires the radial add menu. This is INTENTIONAL per UI-SPEC Open Q #12 and the plan's own `<action>` block — documented in the component comment and committed as a no-op until Phase 3.
- **`EmptyTreeOverlay` exit timing** — UI-SPEC notes that Phase 3 may add a 150ms fade-out when `people.length >= 2`. Phase 2 ships the overlay with instant swap, which is acceptable for the seed-only state.

## Deferred to Plan 02-03

- `<SidePanel>` render (subscribes to `sidePanelOpen` + `selectedPersonId`, which are already being set here)
- Field editing components (`<FieldInput>`, `<FieldTextarea>`, `<GenderSelect>`) + `useSaveQueue` hook
- `<SavePill>` rendering (the state slice `saveStateByPersonId` is already being written by this plan's drag-end branch)
- `<SaveErrorToast>` (subscribes to `'error'` state transitions that this plan produces on `movePerson` failures)
- Remove person wiring (`removePerson` Server Action already exists from Plan 01)

## Next Phase Readiness

- Plan 02-03 can import `DragStateContext` + `useTreeStoreApi` without further prep
- PersonNode's `setSidePanelOpen(true)` is being called from double-click + Enter — `<SidePanel>` just needs to subscribe
- The pill state pipeline (`setSaveState(id, 'saving' | 'saved' | 'error' | 'idle')`) is exercised by drag-end; `<SavePill>` can subscribe identically for field-edit saves

## Self-Check

Commits verified:

```bash
git log --oneline d101b7f..HEAD
3e7900c feat(02-02): PersonNode 180x76 card with all visual states
718eab3 feat(02-02): PanZoomWrapper drag branches + movePerson persistence
d1acc60 feat(02-02): EdgeLayer single-SVG overlay + AvatarCircle 40px
d9f784d feat(02-02): TreeStoreProvider + TreeCanvas shell + PanZoomWrapper
```

Files created:

- `components/canvas/TreeCanvas.tsx` — FOUND
- `components/canvas/PanZoomWrapper.tsx` — FOUND
- `components/canvas/EdgeLayer.tsx` — FOUND
- `components/canvas/PersonNode.tsx` — FOUND
- `components/canvas/AvatarCircle.tsx` — FOUND

Files modified:

- `app/(app)/layout.tsx` — FOUND (`TreeStoreProvider` present)
- `app/(app)/tree/[treeId]/page.tsx` — FOUND (widened select + `<TreeCanvas>` mount)
- `components/shell/TopBar.tsx` — FOUND (`data-topbar` attribute)
- `lib/store/tree-store.ts` — FOUND (`useTreeStoreApi` present)

## Self-Check: PASSED

---
*Phase: 02-canvas-nodes-edit*
*Completed: 2026-04-22*
