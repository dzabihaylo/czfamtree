---
phase: 02-canvas-nodes-edit
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - app/(app)/layout.tsx
  - app/(app)/tree/[treeId]/page.tsx
  - app/actions/people.ts
  - app/globals.css
  - components/canvas/AvatarCircle.tsx
  - components/canvas/EdgeLayer.tsx
  - components/canvas/PanZoomWrapper.tsx
  - components/canvas/PersonNode.tsx
  - components/canvas/RelationsList.tsx
  - components/canvas/SaveErrorToast.tsx
  - components/canvas/SavePill.tsx
  - components/canvas/SidePanel.tsx
  - components/canvas/TreeCanvas.tsx
  - components/canvas/fields/FieldInput.tsx
  - components/canvas/fields/FieldTextarea.tsx
  - components/canvas/fields/GenderSelect.tsx
  - components/shell/TopBar.tsx
  - lib/graph/edges.test.ts
  - lib/graph/edges.ts
  - lib/hooks/useSaveQueue.ts
  - lib/schemas/person.ts
  - lib/store/tree-store.ts
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-04-22
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phase 2 delivers the canvas-edit surface: pan/zoom wrapper, PersonNode cards, edge rendering, side panel with debounced auto-save, save pill/toast UX, and the Zustand store that backs it all. Overall the code is well-structured, documented thoroughly, and the threat-model mitigations (strict Zod patches, RLS defense-in-depth, OS-level confirm before delete) are in the right places.

The most consequential bug is a cluster of user-visible rendering glitches caused by unicode escape sequences (`\u2014`, `\u00B7`, `\u00D7`, `\u2026`, `\u2019`) being placed directly inside JSX attribute strings and JSX text children. JSX treats those positions as HTML-like literal text — not JavaScript string literals — so the compiled output renders the six characters `\u2026` rather than the ellipsis glyph. Every unicode escape inside a JSX attribute or JSX child is affected; escapes inside JavaScript string literals (template literals, array literal values, object property strings) work correctly and were left untouched.

A second warning-level bug is an off-by-TOPBAR_HEIGHT-plus math error in `SidePanel.handleRelationClick` that causes "Center on this person" to render the target roughly 78px below screen center vertically. X-axis math is correct; only Y is off.

Beyond that, findings are a mix of edge-case hardening (unchecked year parsing, empty-tree bbox assumptions), deps-array hygiene (effects holding stale closures on transform values), and minor type-safety items.

No security vulnerabilities were found. Server Actions correctly validate via `PersonPatchSchema.strict()`, RLS is the enforced authz boundary, and the `tree_id` WHERE predicate is applied as documented defense-in-depth.

## Warnings

### WR-01: Unicode escapes in JSX attributes/children render as literal backslash-u text

**File:** `components/canvas/SidePanel.tsx:221`, `SidePanel.tsx:271`, `SidePanel.tsx:314`, `SavePill.tsx:114`, `SaveErrorToast.tsx:105`
**Issue:** JSX treats string attribute values and text children as HTML-like literals. `\uXXXX` escape sequences are interpreted only inside JavaScript string/template literals — not inside `<foo bar="..." />` attributes or `<foo>...</foo>` children. The following positions render the raw six characters (e.g. `\u2026`) instead of the intended glyph:

- `SidePanel.tsx:221` — JSX child: `Person \u00B7 {person.id.slice(0, 6)}` renders `Person \u00B7 a1b2c3` instead of `Person · a1b2c3`
- `SidePanel.tsx:271` — JSX attribute: `placeholder="she/her \u00B7 he/him \u00B7 they/them"` renders `\u00B7` literally in the empty-pronouns placeholder
- `SidePanel.tsx:314` — JSX attribute: `placeholder="Stories, memories, a short bio\u2026"` renders `\u2026` literally
- `SavePill.tsx:114` — JSX attribute: `aria-label="Retry saving \u2014 last save failed"` — screen readers announce the literal `\u2014`
- `SaveErrorToast.tsx:105` — JSX child: bare `\u00D7` text inside a `<button>` renders the literal escape instead of the `×` dismiss glyph

Note that escapes in JavaScript string contexts (e.g. `PersonNode.tsx:74` `yearsText = '\u2014'`, `RelationsList.tsx:47` `'\u2014'`, `SavePill.tsx:40` `label: 'Saving\u2026'`, `SidePanel.tsx:166` template literal `This can\u2019t be undone.`) are correctly interpreted and should NOT be changed.

**Fix:** Wrap each JSX-side escape in a JS expression so it's parsed as a string literal, or paste the literal unicode glyph directly into the source:

```tsx
// SidePanel.tsx:221
Person {'\u00B7'} {person.id.slice(0, 6)}
// or: Person · {person.id.slice(0, 6)}

// SidePanel.tsx:271
placeholder={'she/her \u00B7 he/him \u00B7 they/them'}

// SidePanel.tsx:314
placeholder={'Stories, memories, a short bio\u2026'}

// SavePill.tsx:114
aria-label={'Retry saving \u2014 last save failed'}

// SaveErrorToast.tsx:105
<button ...>{'\u00D7'}</button>
```

### WR-02: `SidePanel.handleRelationClick` centers the target ~78px below screen center vertically

**File:** `components/canvas/SidePanel.tsx:149-155`
**Issue:** The Y-axis centering math does not account for the 52px topbar correctly. The canvas `<section>` is at `top: 52` with the inner `translate(x,y) scale(k)` wrapper nested inside. For a world point `(p.x + NODE_HALF_W, p.y + NODE_HALF_H)` at `k = 1`, screen-Y is `52 + transform.y + (p.y + NODE_HALF_H)`. Setting that equal to `window.innerHeight / 2` gives `transform.y = window.innerHeight/2 - 52 - (p.y + NODE_HALF_H)`.

The current code computes `y: vh / 2 - (p.y + NODE_HALF_H) + TOPBAR_HEIGHT` where `vh = window.innerHeight - TOPBAR_HEIGHT`. Expanding:
```
y = (window.innerHeight - 52)/2 - (p.y + NODE_HALF_H) + 52
  = window.innerHeight/2 + 26 - (p.y + NODE_HALF_H)
```
Expected: `window.innerHeight/2 - 52 - (p.y + NODE_HALF_H)`. Difference is `+78px`, i.e. the target lands 78px below screen center vertically (with the correction visible on first use and on every relation-click or "Center on this person" click). X-axis math is correct.

**Fix:**
```ts
// SidePanel.tsx:153 — replace
y: vh / 2 - (p.y + NODE_HALF_H) + TOPBAR_HEIGHT,
// with
y: window.innerHeight / 2 - TOPBAR_HEIGHT - (p.y + NODE_HALF_H),
```

A unit test that hardcodes `window.innerWidth=1920, window.innerHeight=1080, p.x=0, p.y=0` and asserts the resulting transform would catch regressions.

### WR-03: `parseInt` on the Born/Died inputs silently drops trailing garbage and returns `NaN` on empty-after-trim

**File:** `components/canvas/SidePanel.tsx:290, 297`
**Issue:** The year commit path is `commit('birthYear', v ? parseInt(v, 10) : null)`. Two edge cases leak through:

1. `v = "  "` (whitespace-only, truthy) → `parseInt("  ", 10)` → `NaN`. The server-side `z.number().int().min(0).max(3000).nullable()` will reject `NaN` (since `NaN` fails `z.number().int()`), so the update aborts with a thrown error. From the user's perspective the pill flips to `error` on a blur that they perceive as a delete, which is surprising.
2. `v = "1981abc"` → `parseInt` returns `1981` and silently drops `abc`. The field has `inputMode="numeric"` + `pattern="[0-9]{0,4}"` + `maxLength={4}` to prevent this at the UI layer, but `pattern` in HTML does not block keystrokes — it only surfaces `:invalid`. A user could paste `1981abc` and get silent truncation.

**Fix:** Use a stricter coercion that treats any non-numeric input as `null`:

```ts
function parseYear(v: string): number | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (!/^\d{1,4}$/.test(trimmed)) return null;
  return parseInt(trimmed, 10);
}

onCommit={(v) => commit('birthYear', parseYear(v))}
```

This also makes the input declaratively honor its own `pattern` attribute.

### WR-04: `EdgeLayer` spreads `peopleArray.map(p => p.x)` into `Math.min(...)` — stack overflow risk at large N

**File:** `components/canvas/EdgeLayer.tsx:44-49`
**Issue:** `Math.min(...xs)` and `Math.max(...xs)` use the function-argument spread, which is bounded by the JS engine's argument count limit (typically ~65,536 on V8 / Safari, much lower on some runtimes). The project targets "200 nodes" per EDGE-06 so today this is not triggered — but the failure mode is a sudden `RangeError: Maximum call stack size exceeded` at scale (a collaborator opens a 10k-person demo tree) rather than a gradual slowdown.

**Fix:** Compute min/max with a loop (or `reduce`) to eliminate the spread bound entirely:

```ts
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const p of peopleArray) {
  if (p.x < minX) minX = p.x;
  if (p.x > maxX) maxX = p.x;
  if (p.y < minY) minY = p.y;
  if (p.y > maxY) maxY = p.y;
}
```

This is correctness-adjacent rather than a performance concern — v1 will not hit the limit, but the code hardens for Phase 5+ at zero cost.

### WR-05: `PanZoomWrapper` wheel/mousemove effects depend on individual transform scalars, causing listener churn on every pan/zoom frame

**File:** `components/canvas/PanZoomWrapper.tsx:236-247, 282`
**Issue:** Both `useEffect`s list `transform.x`, `transform.y`, `transform.k` in their dependency arrays. Every frame of a user drag-pan (which mutates `transform.x`/`transform.y` via `setTransform`) tears down and re-registers the `mousemove`/`mouseup` window listeners — the same applies to wheel zoom. On a slow laptop the listener churn itself can cause frame drops, and an in-flight `mousemove` callback from the prior registration has already captured the same transform values so the re-registration delivers no correctness benefit.

The handlers need `transform.k` for the drag-delta divide and `transform.x/y` for the pan start, but those can be read imperatively via `storeApi.getState().transform` — the hook already holds `storeApi`.

**Fix:**
```ts
useEffect(() => {
  const onMove = (e: MouseEvent) => {
    const { transform } = storeApi.getState();
    if (dragStateRef.current) {
      const dx = (e.clientX - dragStateRef.current.startX) / transform.k;
      // ...
    }
    if (panning && panStart.current) {
      setTransform({
        x: panStart.current.tx + (e.clientX - panStart.current.x),
        y: panStart.current.ty + (e.clientY - panStart.current.y),
        k: transform.k,
      });
    }
  };
  // ...
  return () => { /* ... */ };
  // Drop transform.x/y/k from deps now that they're read imperatively.
}, [panning, storeApi, setTransform, setDragging, setPersonPosition, setSaveState, treeId]);
```

Same change applies to the wheel effect at line 282.

### WR-06: `SaveErrorToast` auto-dismiss timer is not reset when the selected error-person ID changes rapidly

**File:** `components/canvas/SaveErrorToast.tsx:63-67`
**Issue:** The dismiss-reset effect fires on `errorPersonId` change (line 59-61), but the auto-dismiss effect depends on `errorPersonId` AND `dismissed`. When the `errorPersonId` changes from A → B during an in-flight timer, React re-runs the `dismissed` reset which will run in a separate effect tick, meaning there's a brief window where `dismissed=true` from person A persists until the reset runs. In rare cases (errors for A, B, C in quick succession), the toast may flicker between showing and dismissing.

More concretely: if the user is editing person A, the save fails, the toast shows, the user dismisses it, then starts editing person B and THAT save also fails — the flow is correct (reset fires, new toast appears). But if a second error on A arrives while A is already in `error` state (retry fails again), the `errorPersonId` dependency doesn't change (it's still A), so the reset effect doesn't re-run and the toast stays dismissed permanently for that session.

**Fix:** Key the dismiss state on a monotonic "error-event" counter rather than on person identity:

```ts
// In useSaveQueue, bump a per-person errorEpoch counter in the store on each
// error transition. SaveErrorToast then depends on errorEpoch to reset
// dismissed, so repeated failures of the same person re-surface the toast.
```

Lower-effort fix: reset `dismissed` whenever the underlying `saveStateByPersonId[errorPersonId]` transitions back into `'error'`:

```ts
useEffect(() => {
  if (!errorPersonId) return;
  if (saveStateByPersonId[errorPersonId] === 'error') setDismissed(false);
}, [errorPersonId, saveStateByPersonId]);
```

## Info

### IN-01: `PanZoomWrapper` drag-threshold uses Manhattan distance (`|dx| + |dy|`), not Euclidean

**File:** `components/canvas/PanZoomWrapper.tsx:165-169`
**Issue:** `moved = Math.abs(dx) + Math.abs(dy)` triggers the 3px threshold on a diagonal drag of `(2.1, 2.1)` (world-space) because `4.2 >= 3`, while the true Euclidean distance is `~2.97px` — below the threshold. This is a subtle feel difference rather than a correctness issue: UI-SPEC §4 specifies "3px" but doesn't specify the norm.

**Fix:** If the spec intent is "the cursor moved 3px in screen space from the mousedown point":
```ts
const moved = Math.hypot(dx, dy);  // Euclidean
```
If the current behavior is intentional, add a comment noting the Manhattan choice.

### IN-02: `useSaveQueue.retry` no-ops silently when there is no `lastFailedPatch`

**File:** `lib/hooks/useSaveQueue.ts:218-221`
**Issue:** `retry(personId)` early-returns with no feedback if `e` is missing or `lastFailedPatch` is null. The `SavePill` error state renders a button that always calls `onRetry` — if the user double-clicks or presses the retry button after the save already succeeded from a later edit, the click does nothing. Minor UX gap; worth either an `info` log in dev builds or a defensive assertion.

**Fix:** No functional change needed, but a dev-only console.info would help debugging:
```ts
retry(personId) {
  const e = byPerson.current.get(personId);
  if (!e || !e.lastFailedPatch) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[useSaveQueue] retry() no-op: no stashed failed patch for', personId);
    }
    return;
  }
  // ...
}
```

### IN-03: `hydratePeople` unconditionally resets `state.people = {}`, losing any optimistic in-flight edits

**File:** `lib/store/tree-store.ts:107-113`
**Issue:** If the user navigates away and back to the same tree mid-save, the RSC re-renders with the server-side people list and `hydratePeople` wipes the local store. Any optimistic patch that hadn't ACKed yet is replaced by the server's pre-patch snapshot — the in-flight save may still complete, but between re-hydrate and ACK the UI shows the old value.

Phase 2's `TreeCanvas` depends only on `tree.id` for re-hydrate, and the route is the same `(app)/tree/[treeId]/page.tsx` so this only fires on real tree switches, not remounts. The current behavior is likely intentional (brief UI flash is better than mutating data drift). Worth documenting: "hydratePeople is authoritative — callers must flush the save queue before invoking on the same treeId."

### IN-04: `EdgeLayer` empty-tree fallback uses magic `2000 × 2000` bbox

**File:** `components/canvas/EdgeLayer.tsx:41-42`
**Issue:** `return { minX: 0, minY: 0, w: 2000, h: 2000 };` for empty trees is arbitrary and uncommented. The `EmptyTreeOverlay` component renders on top of this so the SVG isn't visible, but a future developer might wonder why 2000. Lift to a named constant:

```ts
const EMPTY_TREE_BBOX_PX = 2000; // Safe default when people[] is empty; EmptyTreeOverlay covers it anyway.
```

### IN-05: `personFromRow` silently defaults `spouse_ids`/`parent_ids`/`child_ids` to `[]` even when DB returns a non-array

**File:** `lib/store/tree-store.ts:45-47`
**Issue:** `row.spouse_ids ?? []` only catches `null`/`undefined`. If the DB schema regresses and the column becomes `text` or returns a non-array (e.g., `"a,b,c"`), the `??` fallback doesn't help — `personFromRow` would assign a string where the Person type expects `string[]`. `computeEdges` would then call `.sort()` on whatever it gets with surprising results. The defensive posture is consistent with the rest of the file but the `??` pattern implies more safety than it delivers. Consider:

```ts
spouseIds: Array.isArray(row.spouse_ids) ? row.spouse_ids : [],
```

Same pattern for `parent_ids` and `child_ids`. This is paranoia-level hardening; the DB schema is enforced at the Postgres layer.

---

_Reviewed: 2026-04-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
