---
status: complete
quick_id: 260422-9vu
description: Fix Zustand unstable-selector bug + two related tree-switch hangs discovered during smoke-test
date: 2026-04-22
completed: 2026-04-22T11:25:00Z
commits:
  - eb5ca59
  - 340d786
  - 0c9549c
key-files:
  created: []
  modified:
    - components/canvas/PanZoomWrapper.tsx
    - components/canvas/TreeCanvas.tsx
    - components/shell/TreeSwitcher.tsx
    - lib/store/tree-store.ts
---

## Quick Task 260422-9vu — Canvas Load Bugs

Original scope was a single Zustand selector fix. Browser smoke-test surfaced two additional pre-existing bugs in the tree-switch flow that were blocking the Phase 2 HUMAN-UAT from even starting, so they were folded into this task.

## Root Causes

### 1. Zustand unstable-selector infinite loop (commit `eb5ca59`)

**Symptom:** `Maximum update depth exceeded` + `getServerSnapshot should be cached to avoid an infinite loop` on every tree page load.

**Cause:** Selectors like `(s) => Object.keys(s.people)` allocate a new array on every call. Zustand 5's `useSyncExternalStore` compares snapshots by reference via `Object.is`, so the snapshot looks "changed" on every render → React reschedules → infinite loop.

**Fix:**
- `PanZoomWrapper.tsx` L111: wrapped the `peopleIds` array selector in `useShallow(...)` from `zustand/shallow`. Array identity now only changes when the id set actually changes.
- `TreeCanvas.tsx` L53-54: restructured the primitive selector — subscribe to `s.people` (stable record reference) and derive `.length` outside the selector. Eliminates the `Object.keys` allocation entirely rather than trying to memoize a number.

### 2. New-tree navigation hang (commit `340d786`)

**Symptom:** After clicking "New Tree" in the TreeSwitcher, Next's "rendering" dev indicator stayed lit forever and the cursor kept spinning, even though the GET for the new `/tree/[treeId]` returned 200 on the server.

**Cause:** `TreeSwitcher.handleCreate` called `router.push()` immediately followed by `router.refresh()` inside a React 19 `startTransition(async () => { ... })`. React 19 keeps the transition pending until the callback and any queued revalidation settles, so the trailing `refresh()` traps the transition in a permanent pending state. The route's RSC is already `dynamic='force-dynamic'`, so there is no cache for `refresh()` to bust — the call was redundant AND harmful.

**Fix:** removed the `router.refresh()` line and moved `setOpen(false)` above `router.push` so the menu closes synchronously. Added a comment explaining the React 19 async-transition contract so this doesn't reappear.

### 3. Cross-tree state leak on switch (commit `0c9549c`)

**Latent bug** — not yet reported by the user but discovered while tracing the hang. `hydratePeople` only replaced `state.people`; it left `selectedPersonId`, `sidePanelOpen`, `draggingPersonId`, `dragOrigin`, and `saveStateByPersonId` untouched. Switching from a tree where you had a node selected to a different tree would have rendered the SidePanel against a non-existent person id briefly on hydrate.

**Fix:** reset all per-person transient state alongside the `people` replacement in `hydratePeople`. `treeId` continues to be set by the caller (`TreeCanvas.useEffect`) since it's semantically distinct.

## Verification

- `npx tsc --noEmit` → exit 0 (clean).
- `npx vitest run` → 16 passed, 3 skipped (unchanged baseline).
- Dev server runtime after commit `eb5ca59`: infinite-loop errors disappeared, original tree loads cleanly.
- Dev server runtime after commit `340d786`: awaiting user smoke re-test (next action below).

## Requirements Touched

No Phase 2 requirements are modified. These are pre-existing bugs (1 in Phase 2 code, 2 in Phase 1 code) that block the Phase 2 HUMAN-UAT from executing at all.

## Follow-ups Not Included

Explicitly deferred to keep this task scoped:

- **Code review WR findings** (6 warnings from `02-REVIEW.md`) — literal `\u2014` JSX escapes, SidePanel `handleRelationClick` Y-off-by-78, parseInt on whitespace Born/Died, Math.min/max spread scale, listener churn on transform deps, toast dismissal edge case. Run `/gsd-code-review-fix 02` when ready.
- **Next 16 middleware → proxy rename** — dev-server deprecation warning, separate infrastructure task.
- **Phase 2 HUMAN-UAT** — the 10 items in `02-HUMAN-UAT.md` still need live browser verification; this task only unblocked the test bed.

## Next Action

User re-runs the new-tree smoke test. Expected: click "New Tree" → navigate to new `/tree/[id]` → page renders cleanly with the seed YOU node + EmptyTreeOverlay → no persistent "rendering" indicator, no spinning cursor. Then resume the Phase 2 HUMAN-UAT checklist.
