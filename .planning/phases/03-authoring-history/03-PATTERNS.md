# Phase 3: Authoring & History — Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 22 (10 new components/utils, 6 modified, 4 new tests, 1 new server action, 1 new RPC migration)
**Analogs found:** 18 / 22 (4 are net-new with no in-repo analog — see "No Analog Found")

---

## File Classification

| New/Modified File | Status | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|--------|------|-----------|----------------|---------------|
| `components/canvas/RadialMenu.tsx` | NEW | component (overlay) | event-driven | `components/canvas/SaveErrorToast.tsx` (overlay+esc), `design_handoff_family_tree/source/components.jsx` L77-122 (RadialMenu reference) | role-match (handoff is exact) |
| `components/canvas/Toolbar.tsx` | NEW | component (controls) | request-response | `components/canvas/PanZoomWrapper.tsx` (transform consumer) + `design_handoff_family_tree/source/app.jsx` L451-481 (handoff toolbar) | role-match |
| `components/canvas/SearchPalette.tsx` | NEW | component (modal) | request-response | `components/canvas/SaveErrorToast.tsx` (subscribed overlay), `components/canvas/SidePanel.tsx` (recenter math) | role-match |
| `components/canvas/ToastHost.tsx` | NEW | component (overlay region) | pub-sub | `components/canvas/SaveErrorToast.tsx` (single-toast precedent) | exact (refactor target) |
| `components/canvas/Toast.tsx` | NEW (inline within Host) | component (item) | event-driven | `components/canvas/SaveErrorToast.tsx` (dwell + dismiss) | exact |
| `components/ui/Modal.tsx` | NEW | component (primitive) | event-driven | none in repo — closest is `components/canvas/SidePanel.tsx` (focus+escape patterns) | partial |
| `components/canvas/PersonNode.tsx` | MODIFIED L115-119 | component (card) | event-driven | (self) — replace `console.info` with `setRadialOpenFor(personId)` | exact |
| `components/canvas/SidePanel.tsx` | MODIFIED L161-189 | component (panel) | request-response | (self) — drop `window.confirm` from `handleRemove`, swap to inline-undo toast | exact |
| `components/canvas/PanZoomWrapper.tsx` | MODIFIED L161-253 (drag handlers) | component (canvas) | event-driven | (self) — wrap mousedown→mouseup in `temporal.pause()`/`resume()` | exact |
| `components/canvas/TreeCanvas.tsx` | MODIFIED | component (root) | mount-only | (self) — mount `<RadialMenu>` / `<Toolbar>` / `<SearchPalette>` / `<ToastHost>` + keyboard listener | exact |
| `lib/store/tree-store.ts` | MODIFIED (slice + temporal config) | store factory | state | (self) L91-179 — add slice fields, replace `temporal({ limit: 50 })` with full zundo config | exact |
| `lib/hooks/useSaveQueue.ts` | MODIFIED (add `enqueueInverse`) | hook | request-response | (self) — additive method following `enqueueField` shape | exact |
| `lib/hooks/useSaveErrorToast.ts` | NEW | hook (publisher) | pub-sub | `components/canvas/SaveErrorToast.tsx` L38-69 (subscription logic) | exact (logic ports straight in) |
| `lib/hooks/useTreeKeyboard.ts` | NEW (optional helper) | hook (listener) | event-driven | `components/canvas/PanZoomWrapper.tsx` L293-305 (Esc listener) | exact |
| `lib/graph/placement.ts` | NEW | utility (pure fn) | transform | `lib/graph/edges.ts` L13-41 (NODE_W/NODE_H + pure-function shape) | role-match |
| `lib/graph/placement.test.ts` | NEW | test (unit) | request-response | `lib/graph/edges.test.ts` L1-57 (Vitest layout for pure utilities) | exact |
| `lib/graph/relations.ts` | NEW | utility (pure fn) | transform | `design_handoff_family_tree/source/model.jsx` L14-42 (relationLabel ref impl) | role-match |
| `lib/graph/relations.test.ts` | NEW | test (unit) | request-response | `lib/graph/edges.test.ts` (same layout) | exact |
| `app/actions/people.ts` | MODIFIED (add `addPerson`) | server action | request-response | (self) L17-73 — `updatePerson`/`movePerson`/`removePerson` exact pattern | exact |
| `supabase/migrations/<n>_add_person_with_relation.sql` | NEW (recommended per Open Q #1) | migration | DDL | existing `bootstrap_tree` SECURITY DEFINER RPC in `supabase/migrations/20260421000000_initial_schema.sql` | role-match |
| `e2e/phase-3-demo-path.spec.ts` | NEW | test (E2E) | end-to-end | (none in repo yet — Phase 2 ships HUMAN-UAT only) | no analog |
| `app/(app)/tree/[treeId]/page.tsx` | (likely UNCHANGED) | RSC | request-response | (self) — already selects everything `personFromRow` needs | n/a |

---

## Pattern Assignments

### `components/canvas/RadialMenu.tsx` (NEW — component, event-driven overlay)

**Primary analog:** `design_handoff_family_tree/source/components.jsx` L77-123 (handoff `RadialMenu`).
**Secondary analog:** `components/canvas/SaveErrorToast.tsx` (overlay subscription + esc dismiss patterns from in-repo code).

**'use client' + Zustand subscription pattern** (copy from `components/canvas/SaveErrorToast.tsx` L1-9):
```typescript
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTreeStore } from '@/lib/store/tree-store';
```

**Reference geometry pattern** (copy from `design_handoff_family_tree/source/components.jsx` L77-122 — adapt to TS + 4 named items + `cn()`):
```jsx
function RadialMenu({ anchor, onPick, onClose }) {
  const items = [
    { key: 'parent', label: 'Parent', sym: '↑', angle: -90 },
    { key: 'spouse', label: 'Spouse', sym: '↔', angle: 0 },
    { key: 'child',  label: 'Child',  sym: '↓', angle: 90 },
    { key: 'sibling',label: 'Sibling',sym: '←', angle: 180 },
  ];
  const R = 90;

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e) => {
      if (!e.target.closest('.radial')) onClose();
    };
    window.addEventListener('keydown', onKey);
    setTimeout(() => window.addEventListener('mousedown', onClick), 10);
    return () => { /* removeEventListener pair */ };
  }, [onClose]);

  return (
    <div className="radial open" style={{ left: anchor.x, top: anchor.y }}>
      {items.map((it) => {
        const rad = it.angle * Math.PI / 180;
        const dx = Math.cos(rad) * R;
        const dy = Math.sin(rad) * R;
        return (
          <button key={it.key} className="radial-btn"
            style={{ left: dx, top: dy, transform: 'translate(-50%, -50%) scale(1)' }}
            onClick={(e) => { e.stopPropagation(); onPick(it.key); }}>
            <span className="radial-btn-icon">{it.sym}</span>
            <span className="radial-btn-label">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

**Esc-dismiss pattern in TS** (copy from `components/canvas/PanZoomWrapper.tsx` L293-305):
```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    const tag = (e.target as Element | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    setRadialOpenFor(null);
  };
  window.addEventListener('keydown', onKey);
  return () => { window.removeEventListener('keydown', onKey); };
}, [setRadialOpenFor]);
```

**Tailwind v4 + handoff token pattern** (copy from `components/canvas/PersonNode.tsx` L142-156 — inline `style` for handoff CSS variables):
```typescript
style={{
  left: dx, top: dy,
  width: 56, height: 56,
  background: 'var(--bg-card)',
  border: '1px solid var(--ink)',
  // hover/focus background flips to var(--accent-soft) per RAD-02 — implement via CSS :hover or className
}}
```

**ARIA wrapper** (per UI-SPEC §10): `<div role="menu" aria-label="Add relative for {anchor.name}">`. Each button: `role="menuitem"` + `aria-label="Add {kind} for {anchor.name}"`.

**Mount location:** sibling of `PersonNode`s inside the inner pan/zoom transform `<div>` in `PanZoomWrapper.tsx` L321-332 (so radial inherits pan/zoom but is not clipped by node bbox — see RESEARCH.md Anti-Pattern §"Putting the radial menu inside `<PersonNode>`").

---

### `components/canvas/Toolbar.tsx` (NEW — component, request-response)

**Primary analog:** `design_handoff_family_tree/source/app.jsx` L451-481 (handoff toolbar markup).
**Secondary analog:** `components/canvas/PanZoomWrapper.tsx` (transform reads/writes via `useTreeStore` + `setTransform`).

**Toolbar layout pattern** (copy from `design_handoff_family_tree/source/app.jsx` L451-481 — port `<button>` → typed `<button type="button">`, swap handoff `<window.Icons.X/>` → lucide-react named imports):
```jsx
<div className="toolbar">
  <button className="toolbar-btn" onClick={undo} disabled={hIndex === 0} title="Undo (⌘Z)">
    <window.Icons.Undo/>
  </button>
  <button className="toolbar-btn" onClick={redo} disabled={hIndex >= history.length - 1}>
    <window.Icons.Redo/>
  </button>
  <div className="toolbar-divider"/>
  <button className="toolbar-btn" onClick={() => zoomBy(0.85)}>...</button>
  <div className="toolbar-zoom">{Math.round(transform.k * 100)}%</div>
  <button className="toolbar-btn" onClick={() => zoomBy(1.18)}>...</button>
  <button className="toolbar-btn" onClick={fitView}>...</button>
  <button className="toolbar-btn" onClick={tidy}>...</button>
  <div className="toolbar-divider"/>
  <button className="toolbar-btn" onClick={() => setSidePanelOpen(o => !o)} disabled={!selectedId}>...</button>
</div>
```

**Tokens** (copy from `design_handoff_family_tree/source/styles.css` L334-365):
```css
.toolbar { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  background: var(--bg-card); border: 1px solid var(--ink);
  display: flex; align-items: center; z-index: 50; box-shadow: 4px 4px 0 var(--ink); }
.toolbar-btn { width: 40px; height: 40px; display: grid; place-items: center;
  border-right: 1px solid var(--rule); color: var(--ink-2); }
.toolbar-btn:last-child { border-right: none; }
.toolbar-btn:hover { background: var(--bg-soft); color: var(--ink); }
.toolbar-btn.active { background: var(--ink); color: var(--bg); }
.toolbar-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.toolbar-divider { width: 1px; height: 24px; background: var(--rule); }
.toolbar-zoom { font-family: var(--mono); font-size: 11px; padding: 0 12px;
  color: var(--ink-2); min-width: 60px; text-align: center; }
```
**Implementation note:** since the project ships Tailwind v4 with `@theme` tokens (NOT `.toolbar-btn` global classes), translate the above into Tailwind utility classes referencing the same CSS variables — same approach `components/canvas/PersonNode.tsx` already uses (e.g. L142 `'absolute flex items-center bg-bg-card select-none'` + inline `style={{ background: 'var(--ink)' }}` for properties Tailwind doesn't expose).

**Selectors pattern** (copy from `components/canvas/PanZoomWrapper.tsx` L99-115 — per-slice subscriptions to avoid wide re-renders):
```typescript
const transform = useTreeStore((s) => s.transform);
const setTransform = useTreeStore((s) => s.setTransform);
const sidePanelOpen = useTreeStore((s) => s.sidePanelOpen);
const setSidePanelOpen = useTreeStore((s) => s.setSidePanelOpen);
const selectedPersonId = useTreeStore((s) => s.selectedPersonId);
const storeApi = useTreeStoreApi();
// For temporal pastStates length read: storeApi.temporal.getState().pastStates.length
```

**ARIA wrapper** (per UI-SPEC §10): `<div role="toolbar" aria-label="Canvas controls">`. Tidy button uses `aria-disabled="true"` (NOT native `disabled`) so it's tab-reachable per A11Y-03.

**Lucide icons** (per UI-SPEC §Component Inventory): `Undo2`, `Redo2`, `ZoomOut`, `ZoomIn`, `Maximize2`, `Sparkles`, `PanelRight` — at 16px, `aria-hidden="true"` (the parent button carries the `aria-label`).

---

### `components/canvas/SearchPalette.tsx` (NEW — component, request-response)

**Primary analog:** `components/canvas/SidePanel.tsx` L140-159 (recenter math + Zustand wiring).
**Secondary analog:** `components/canvas/SaveErrorToast.tsx` (subscribed overlay + dismiss state).

**Subscription + filter pattern** (copy from `components/canvas/SaveErrorToast.tsx` L38-50 — replace error-filter with name-filter + use `useShallow` per Pitfall #4):
```typescript
import { useShallow } from 'zustand/shallow';

const sortedPeople = useTreeStore(useShallow((s) =>
  Object.values(s.people).sort((a, b) =>
    (a.name || '￿').localeCompare(b.name || '￿')
  )
));
const [query, setQuery] = useState('');
const results = useMemo(() =>
  sortedPeople.filter(p => p.name.toLowerCase().includes(query.toLowerCase())),
  [sortedPeople, query]
);
```

**Recenter pattern** (copy from `components/canvas/SidePanel.tsx` L140-159):
```typescript
const handleRelationClick = useCallback((id: string) => {
  setSelectedPersonId(id);
  const p = storeApi.getState().people[id];
  if (p) {
    const vw = window.innerWidth - PANEL_WIDTH;
    const vh = window.innerHeight - TOPBAR_HEIGHT;
    setTransform({
      x: vw / 2 - (p.x + NODE_HALF_W),
      y: vh / 2 - (p.y + NODE_HALF_H) + TOPBAR_HEIGHT,
      k: 1,
    });
  }
}, [setSelectedPersonId, storeApi, setTransform]);
```
**Phase 3 deltas:** (a) DO NOT subtract `PANEL_WIDTH` (panel may be closed; per UI-SPEC §5 use full viewport — `vw = window.innerWidth`); (b) DO NOT call `setSidePanelOpen(true)` — pure select+center per SRCH-02 / D-21; (c) trigger 300ms CSS tween via `data-canvas-inner` attribute toggle per RESEARCH.md Code Example F; (d) `pushToast({ kind: 'success', message: 'Centered on {name}', dwellMs: 2200, ariaRole: 'status', ariaLive: 'polite' })`.

**Modal wrapper:** consume the new `<Modal>` primitive (see below). Override `width=520`, `topOffset=120` per UI-SPEC §"Spacing Scale" component constants table.

**Result row uses `<AvatarCircle>`** — copy import from `components/canvas/SidePanel.tsx` style; the avatar primitive at `components/canvas/AvatarCircle.tsx` already 40px and `aria-hidden="true"` (verbatim reuse).

**ARIA + keyboard** (per UI-SPEC §10): `<div role="dialog" aria-modal="true" aria-label="Search people">` wrapping the modal box; `<input aria-controls="search-results" aria-label="Search people in this tree by name">`; `<ul id="search-results" role="listbox">`; each row `role="option" aria-selected={isKeyboardActive}`. Save `document.activeElement` BEFORE open into a ref; restore on Esc/dismiss (Pitfall #10).

---

### `components/canvas/ToastHost.tsx` (NEW — component, pub-sub region)

**Primary analog:** `components/canvas/SaveErrorToast.tsx` (entire file — generalize the dwell+dismiss state machine to render an array of toasts).

**Mount pattern** (copy from `components/canvas/TreeCanvas.tsx` L88 — toast lives at canvas root, OUTSIDE the panel conditional, so a save error on a non-selected person still surfaces; per Pitfall #5 toasts are not mounted inside SidePanel):
```typescript
{/* In TreeCanvas.tsx — replace the existing line: */}
<SaveErrorToast onRetry={(id) => queue.retry(id)} />
{/* With: */}
<ToastHost />
```

**Toast item dwell timer pattern** (copy from `components/canvas/SaveErrorToast.tsx` L63-67):
```typescript
useEffect(() => {
  if (!errorPersonId || dismissed) return;
  const t = setTimeout(() => setDismissed(true), TOAST_DISMISS_MS);
  return () => clearTimeout(t);
}, [errorPersonId, dismissed]);
```
**Phase 3 generalization:** each `<Toast>` child owns its own dwell `useEffect`, calling `dismissToast(toast.id)` (idempotent per Pitfall #5) when timer fires; cleanup `clearTimeout` on unmount.

**Toast styling pattern** (copy from `components/canvas/SaveErrorToast.tsx` L73-86 — keep the inline-style approach because handoff `.toast` class isn't in `app/globals.css`):
```typescript
<div
  role="alert" /* or 'status' for non-error variants */
  aria-live="assertive" /* or 'polite' for non-error */
  className="fixed left-1/2 flex items-center gap-[12px] font-sans text-[13px] text-bg-card bg-ink"
  style={{
    bottom: 80,
    transform: 'translateX(-50%)',
    padding: '10px 16px',
    zIndex: 200,
    boxShadow: '3px 3px 0 var(--accent)',
  }}
>
  <span>...</span>
  <button ...>Action</button>
</div>
```
**Phase 3 deltas:** stack multiple via `bottom: 80px + index * (toastHeight + 8px)`, max 3 visible (oldest auto-shifts when 4th arrives — done in `pushToast` setter, NOT in render). Wrap the host in `<div aria-label="Notifications" role="region">` per UI-SPEC §10.

**Action-button pattern** (copy from `components/canvas/SaveErrorToast.tsx` L88-98 — accent text, semibold, hover underline):
```typescript
<button
  type="button"
  onClick={toast.action.onAction}
  aria-label={`${toast.action.label} ${...}`}
  className="font-semibold hover:underline"
  style={{ color: 'var(--accent)' }}
>
  {toast.action.label}
</button>
```

---

### `components/canvas/Toast.tsx` (NEW — inline within ToastHost; component, event-driven)

**Analog:** same as `<ToastHost>` — extract the per-item rendering for clarity.

Same imports / styles as ToastHost. Each instance receives `{toast: Toast, index: number}` and runs its own dismiss timer per Pitfall #5.

---

### `components/ui/Modal.tsx` (NEW — component, generic primitive — NO direct in-repo analog)

**Primary analog:** `design_handoff_family_tree/source/styles.css` L408-450 (handoff `.modal-backdrop` + `.modal` styles).
**Secondary analog:** `components/canvas/SidePanel.tsx` (focus management + Escape handling patterns).

**Tokens** (copy from `design_handoff_family_tree/source/styles.css` L408-424):
```css
.modal-backdrop { position: fixed; inset: 0; background: oklch(0.18 0.008 80 / 0.4);
  z-index: 100; display: grid; place-items: center; animation: fadeIn 0.15s ease; }
.modal { background: var(--bg-card); border: 1px solid var(--ink);
  width: 480px; max-width: calc(100vw - 40px);
  box-shadow: 8px 8px 0 var(--ink);
  animation: popIn 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.1); }
```

**Component shape:**
```typescript
type ModalProps = {
  width?: number;            // default 480, search palette uses 520
  topOffset?: number;        // default null = vertically centered; search palette uses 120
  ariaLabel: string;
  onDismiss: () => void;
  children: ReactNode;
};
```

**Backdrop click + Esc + focus restoration** (combine Pitfall #10 pattern + `components/canvas/PanZoomWrapper.tsx` L293-305 Esc handler):
```typescript
const restoreRef = useRef<HTMLElement | null>(null);
useEffect(() => {
  restoreRef.current = document.activeElement as HTMLElement | null;
  return () => { restoreRef.current?.focus(); };
}, []);

useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onDismiss(); }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [onDismiss]);
```

**Phase 5 reuse:** Share modal will consume `<Modal width={520} topOffset={null} ariaLabel="Share this tree" onDismiss={...}>...</Modal>`. Keep the API minimal so Phase 5 doesn't need to fork.

---

### `components/canvas/PersonNode.tsx` MODIFIED L115-119 (component, event-driven)

**Analog:** (self) — surgical line-range edit.

**Current code** (`components/canvas/PersonNode.tsx` L112-119):
```typescript
// `+` button click — Phase 2 no-op placeholder. Phase 3 RAD-01 wires the
// radial add menu. Console flag logs the intent so manual testing can
// verify the button is reachable without silently doing nothing.
const onPlusClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  // eslint-disable-next-line no-console
  console.info('[Phase 3] radial open for', personId);
};
```

**Replacement pattern** (mirrors per-slice setter idiom from L60-62):
```typescript
const setRadialOpenFor = useTreeStore((s) => s.setRadialOpenFor);

const onPlusClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  setRadialOpenFor(personId);
};
```

**Plus other-node-click clears radial** (per Pitfall #3): `onMouseDown` at L83 currently calls `setSelectedPersonId(personId)` first. Add `setRadialOpenFor(null)` BEFORE that to dismiss any open radial when selecting a different node:
```typescript
const onMouseDown = (e: React.MouseEvent) => {
  if (e.button !== 0) return;
  e.stopPropagation();
  setRadialOpenFor(null); // NEW — clear stale radial anchor
  setSelectedPersonId(personId);
  // ...rest unchanged
};
```

---

### `components/canvas/SidePanel.tsx` MODIFIED L161-189 (component, request-response)

**Analog:** (self) — replace `window.confirm` block with optimistic delete + toast.

**Current code** (`components/canvas/SidePanel.tsx` L161-189):
```typescript
const handleRemove = useCallback(async () => {
  if (!personId || !person || person.isMe) return;
  const displayName = person.name || 'this person';
  if (
    !window.confirm(
      `Remove ${displayName} from the tree? This can’t be undone.`,
    )
  ) {
    return;
  }
  try {
    await removePerson(tree.id, personId);
    removePersonFromStore(personId);
    setSidePanelOpen(false);
    setSelectedPersonId(null);
  } catch (_err) {
    storeApi.getState().setSaveState(personId, 'error');
  }
}, [...]);
```

**Replacement pattern** (per UI-SPEC §6 + D-24 — optimistic-first + inline-undo toast):
```typescript
const handleRemove = useCallback(async () => {
  if (!personId || !person || person.isMe) return;
  const displayName = person.name || 'this person';
  const snapshot = { ...person }; // for rollback / replay on undo
  // Optimistic delete + history push (zundo's _handleSet captures the people-map delta)
  removePersonFromStore(personId);
  setSidePanelOpen(false);
  setSelectedPersonId(null);
  // Server commit
  try {
    await removePerson(tree.id, personId);
    pushToast({
      kind: 'info',
      message: `Removed ${displayName}`,
      action: { label: 'Undo', onAction: () => storeApi.temporal.getState().undo() },
      dwellMs: 6000,
      ariaRole: 'status',
      ariaLive: 'polite',
      personId,
    });
  } catch (_err) {
    // Rollback per D-25 — restore local state, surface SaveErrorToast (ToastHost handles it)
    storeApi.getState().setSaveState(personId, 'error');
    // Re-add the person to the store via a non-history-pushing setter (or temporal.pause/resume bracket)
  }
}, [personId, person, tree.id, ...]);
```

**Phase 3 import additions** (mirror `components/canvas/SidePanel.tsx` L4-12 import block):
```typescript
const pushToast = useTreeStore((s) => s.pushToast);
// storeApi.temporal.getState().undo() — use existing useTreeStoreApi hook L103
```

---

### `components/canvas/PanZoomWrapper.tsx` MODIFIED L161-253 (component, event-driven)

**Analog:** (self) — wrap the existing drag handlers in `temporal.pause()` / `resume()` per RESEARCH.md Pattern 1 + Code Example B.

**Current onUp branch** (`components/canvas/PanZoomWrapper.tsx` L192-235):
```typescript
const onUp = () => {
  if (dragStateRef.current && draggingActiveRef.current) {
    const ds = dragStateRef.current;
    const finalPerson = storeApi.getState().people[ds.id];
    setDragging(null);
    draggingActiveRef.current = false;
    if (finalPerson) {
      const { x, y } = finalPerson;
      setSaveState(ds.id, 'saving');
      movePerson(treeId, ds.id, x, y).then(...).catch(...);
    }
  }
  // ...
};
```

**Phase 3 wrap pattern** (RESEARCH.md Code Example B — bracket mousedown→mouseup so ONE pastState push captures the delta):
```typescript
// In PersonNode.tsx onMouseDown OR PanZoomWrapper's onCanvasMouseDown when drag-seeded:
storeApi.temporal.getState().pause();

// In onUp, after final position read but BEFORE setSaveState:
storeApi.temporal.getState().resume();
// Tickle setPersonPosition with the same final coords so the post-resume push fires:
setPersonPosition(ds.id, x, y);
```

**Defensive cleanup branch** (per Anti-Pattern §"Calling temporal.pause() without resume()"): also call `resume()` in the no-threshold-crossed branch (L227-231) so a misfired pause doesn't permanently halt history tracking.

---

### `components/canvas/TreeCanvas.tsx` MODIFIED (component, mount-only)

**Analog:** (self) — additive component mounts.

**Current render** (`components/canvas/TreeCanvas.tsx` L78-90):
```typescript
return (
  <>
    <PanZoomWrapper tree={tree} />
    {peopleCount <= 1 && <EmptyTreeOverlay />}
    {sidePanelOpen && selectedPersonId && (
      <SidePanel tree={tree} queue={queue} />
    )}
    <SaveErrorToast onRetry={(id) => queue.retry(id)} />
  </>
);
```

**Phase 3 replacement:**
```typescript
useTreeKeyboard({ treeId: tree.id }); // mounts ⌘Z/⌘⇧Z/⌘Y/⌘K/⌘F listener
useSaveErrorToast({ queue });          // publisher hook subscribes to saveStateByPersonId

return (
  <>
    <PanZoomWrapper tree={tree} />
    {peopleCount <= 1 && <EmptyTreeOverlay />}
    {sidePanelOpen && selectedPersonId && (
      <SidePanel tree={tree} queue={queue} />
    )}
    <Toolbar />
    {/* RadialMenu mounts INSIDE PanZoomWrapper's transform div — see RadialMenu pattern above. Move there, NOT here. */}
    <SearchPalette /> {/* internal: returns null when !searchOpen */}
    <ToastHost />
  </>
);
```

**Hydrate effect unchanged** (`components/canvas/TreeCanvas.tsx` L65-76).

---

### `lib/store/tree-store.ts` MODIFIED (store factory, state)

**Analog:** (self) — slice fields + replace `temporal({ limit: 50 })` block at L177.

**Current temporal config** (`lib/store/tree-store.ts` L177):
```typescript
{ limit: 50 },
```

**Phase 3 replacement** (RESEARCH.md Code Example A — verified against `node_modules/zundo/dist/index.d.ts` L4-19):
```typescript
import { shallow } from 'zustand/shallow';

{
  limit: 100,
  partialize: (state: TreeState) => ({ people: state.people }),
  equality: shallow,
}
```

**Slice additions** (mirror existing setter pattern at L107-175 — immer mutation inside `set((state) => { ... })`):
```typescript
// In TreeState interface (mirrors L58-82):
radialOpenFor: string | null;
searchOpen: boolean;
searchQuery: string;
toasts: Toast[];

setRadialOpenFor: (personId: string | null) => void;
setSearchOpen: (open: boolean) => void;
setSearchQuery: (q: string) => void;
pushToast: (toast: Omit<Toast, 'id'>) => string;
dismissToast: (id: string) => void;

// In factory (mirrors L99-104 initial state + L107-175 setters):
radialOpenFor: null,
searchOpen: false,
searchQuery: '',
toasts: [],

setRadialOpenFor: (personId) =>
  set((state) => { state.radialOpenFor = personId; }),
// ... other setters following the same shape
```

**`pushToast` ID-return pattern** (RESEARCH.md Code Example E + Pitfall §immer return-value caveat — capture id outside `set()`):
```typescript
pushToast: (toast) => {
  const id = nanoid(10);
  set((state) => {
    state.toasts.push({ ...toast, id });
    while (state.toasts.length > 3) state.toasts.shift();
  });
  return id;
},
dismissToast: (id) =>
  set((state) => {
    state.toasts = state.toasts.filter((t) => t.id !== id);
  }),
```

**Hydrate reset** (mirror L107-122 — extend `hydratePeople` to also reset Phase 3 ephemeral fields when the tree switches):
```typescript
hydratePeople: (rows) =>
  set((state) => {
    state.people = {};
    for (const r of rows) state.people[r.id] = personFromRow(r);
    state.selectedPersonId = null;
    state.sidePanelOpen = false;
    state.draggingPersonId = null;
    state.dragOrigin = null;
    state.saveStateByPersonId = {};
    // Phase 3 additions:
    state.radialOpenFor = null;
    state.searchOpen = false;
    state.searchQuery = '';
    state.toasts = [];
  }),
```

---

### `lib/hooks/useSaveQueue.ts` MODIFIED (hook, request-response)

**Analog:** (self) — additive method following `enqueueField` shape.

**Current API** (`lib/hooks/useSaveQueue.ts` L47-56):
```typescript
export type SaveQueue = {
  enqueueField: <K extends keyof PersonPatch>(personId: PersonId, field: K, value: PersonPatch[K]) => void;
  enqueueMove: (personId: PersonId, x: number, y: number) => void;
  flush: (personId: PersonId) => void;
  retry: (personId: PersonId) => void;
};
```

**Phase 3 addition** (RESEARCH.md Pitfall #2 + Open Q #2 — `enqueueInverse` merges full patch into pending and triggers `runSave` without debounce):
```typescript
enqueueInverse: (personId: PersonId, prevFields: PersonPatch) => void;

// Implementation (mirrors enqueueMove pattern at L187-203 — no debounce):
enqueueInverse(personId, prevFields) {
  const e = getEntry(personId);
  Object.assign(e.pending, prevFields);
  if (!e.inFlight) {
    e.inFlight = runSave(personId);
  }
},
```

**No-other-changes:** the existing serial-queue contract at L114-164 (capture-and-clear pattern, finally-chain pattern) covers undo replay correctly.

---

### `lib/hooks/useSaveErrorToast.ts` (NEW — hook, pub-sub)

**Analog:** `components/canvas/SaveErrorToast.tsx` (entire file — same logic, refactor into a publisher hook).

**Subscription pattern** (copy from `components/canvas/SaveErrorToast.tsx` L38-52):
```typescript
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTreeStore } from '@/lib/store/tree-store';
import type { SaveQueue } from '@/lib/hooks/useSaveQueue';

export function useSaveErrorToast({ queue }: { queue: SaveQueue }) {
  const saveStateByPersonId = useTreeStore((s) => s.saveStateByPersonId);
  const peopleRecord = useTreeStore((s) => s.people);
  const pushToast = useTreeStore((s) => s.pushToast);

  const errorPersonId = useMemo(() => {
    for (const [id, state] of Object.entries(saveStateByPersonId)) {
      if (state === 'error') return id;
    }
    return null;
  }, [saveStateByPersonId]);

  const lastPushedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!errorPersonId || lastPushedRef.current === errorPersonId) return;
    const person = peopleRecord[errorPersonId];
    if (!person) return;
    const displayName = person.name || 'Unnamed';
    pushToast({
      kind: 'error',
      message: `Couldn't save changes for ${displayName}`,
      action: { label: 'Retry', onAction: () => queue.retry(errorPersonId) },
      dwellMs: 4400,
      ariaRole: 'alert',
      ariaLive: 'assertive',
      personId: errorPersonId,
    });
    lastPushedRef.current = errorPersonId;
  }, [errorPersonId, peopleRecord, pushToast, queue]);
}
```

**Why a hook, not a component:** Phase 3 generalizes the subscription so `<SaveErrorToast>` becomes a publisher of generic toasts (D-15) — the actual rendering is owned by `<ToastHost>`. Mount this hook at `<TreeCanvas>` root.

**Note:** `lastPushedRef` ensures one toast per oldest-errored person — mirrors the merge logic in `components/canvas/SaveErrorToast.tsx` L42-50.

---

### `lib/hooks/useTreeKeyboard.ts` (NEW — hook, event-driven; OPTIONAL helper)

**Analog:** `components/canvas/PanZoomWrapper.tsx` L293-305 (existing Esc keyboard listener — exact pattern, expand to ⌘Z/⌘⇧Z/⌘Y/⌘K/⌘F).

**Existing in-repo pattern** (copy from `components/canvas/PanZoomWrapper.tsx` L293-305):
```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    const tag = (e.target as Element | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    setSelectedPersonId(null);
    setSidePanelOpen(false);
  };
  window.addEventListener('keydown', onKey);
  return () => { window.removeEventListener('keydown', onKey); };
}, [setSelectedPersonId, setSidePanelOpen]);
```

**Phase 3 expansion** (RESEARCH.md Pattern 3 / Code Example inline — `document.activeElement` gate for shortcuts that must defer to native input behavior):
```typescript
'use client';

import { useEffect } from 'react';
import { useTreeStore, useTreeStoreApi } from '@/lib/store/tree-store';

export function useTreeKeyboard({ treeId: _treeId }: { treeId: string }) {
  const setSearchOpen = useTreeStore((s) => s.setSearchOpen);
  const storeApi = useTreeStoreApi();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Scope gate (HIST-04 + A11Y-02). Skip when focus owns native undo / find.
      const ae = document.activeElement;
      const tag = ae?.tagName;
      const isContentEditable = (ae as HTMLElement | null)?.isContentEditable ?? false;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || isContentEditable) return;

      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) storeApi.temporal.getState().redo();
        else storeApi.temporal.getState().undo();
        return;
      }
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        storeApi.temporal.getState().redo();
        return;
      }
      if (e.key === 'k' || e.key === 'K' || e.key === 'f' || e.key === 'F') {
        e.preventDefault(); // suppress browser Find when canvas owns focus (UI-SPEC §8)
        setSearchOpen(true);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [storeApi, setSearchOpen]);
}
```

---

### `lib/graph/placement.ts` (NEW — utility, pure transform)

**Analog:** `lib/graph/edges.ts` L13-41 (NODE_W/NODE_H constants + pure-function shape).

**Constants pattern** (copy from `lib/graph/edges.ts` L13-14):
```typescript
import { NODE_W, NODE_H } from './edges';
```
**Phase 3 specifics** (UI-SPEC §"Add-relative placement geometry" + RESEARCH.md Code Example D):
```typescript
const COLLISION_RADIUS = NODE_W + 32; // 212px
const NUDGE_STEP = NODE_H + 16;       // 92px
const MAX_ITER = 20;

type Pt = { x: number; y: number };

export function nudgePosition(
  initial: Pt,
  people: Record<string, { x: number; y: number }>,
): Pt {
  let { x, y } = initial;
  for (let i = 0; i < MAX_ITER; i++) {
    const collides = Object.values(people).some(
      (p) => Math.abs(p.x - x) < COLLISION_RADIUS && Math.abs(p.y - y) < NODE_H,
    );
    if (!collides) return { x, y };
    y += NUDGE_STEP;
  }
  return { x, y }; // bounded fallback (Pitfall #9)
}

export function initialOffsetFor(
  kind: 'parent' | 'spouse' | 'child' | 'sibling',
  anchor: Pt,
): Pt {
  switch (kind) {
    case 'spouse':  return { x: anchor.x + NODE_W + 32, y: anchor.y };
    case 'parent':  return { x: anchor.x, y: anchor.y - NODE_H - 80 };
    case 'child':   return { x: anchor.x, y: anchor.y + NODE_H + 80 };
    case 'sibling': return { x: anchor.x - NODE_W - 32, y: anchor.y };
  }
}
```

**JSDoc header pattern** (copy from `lib/graph/edges.ts` L1-12 — file-level comment explains origin + invariants).

---

### `lib/graph/placement.test.ts` (NEW — test, unit)

**Analog:** `lib/graph/edges.test.ts` L1-57 (Vitest layout, import shape, describe/it/expect organization).

**Imports + describe scaffolding** (copy from `lib/graph/edges.test.ts` L1-17):
```typescript
import { describe, it, expect } from 'vitest';
import { nudgePosition, initialOffsetFor } from '@/lib/graph/placement';
import { NODE_W, NODE_H } from '@/lib/graph/edges';

describe('nudgePosition', () => {
  it('returns the initial position when no collision', () => {
    expect(nudgePosition({ x: 0, y: 0 }, {})).toEqual({ x: 0, y: 0 });
  });

  it('shifts by NODE_H + 16 when same-row collision', () => {
    // ...
  });

  it('returns last attempted position after MAX_ITER (no throw)', () => {
    // ...
  });
});

describe('initialOffsetFor', () => {
  it('places spouse at anchor.x + NODE_W + 32', () => {
    expect(initialOffsetFor('spouse', { x: 100, y: 100 })).toEqual({
      x: 100 + NODE_W + 32, y: 100,
    });
  });
  // ...
});
```

**Test cases per CONTEXT.md D-13** (singleton, occupied row, deep nudge chain, max-iter fallback). 4 cases minimum.

---

### `lib/graph/relations.ts` (NEW — utility, pure transform)

**Analog:** `design_handoff_family_tree/source/model.jsx` L14-42 (handoff `relationLabel` ref impl — direct port to TS).

**Reference impl** (copy from `design_handoff_family_tree/source/model.jsx` L14-42):
```javascript
const relationLabel = (person, rootId, people) => {
  if (!rootId || person.id === rootId) return 'you';
  const root = people.find(p => p.id === rootId);
  if (!root) return person.relation || '';
  if (root.spouseIds?.includes(person.id)) return 'spouse';
  if (root.parentIds?.includes(person.id)) {
    return person.gender === 'f' ? 'mother' : person.gender === 'm' ? 'father' : 'parent';
  }
  if (person.parentIds?.includes(rootId) || root.childIds?.includes(person.id)) {
    return person.gender === 'f' ? 'daughter' : person.gender === 'm' ? 'son' : 'child';
  }
  const rootParents = root.parentIds || [];
  if (rootParents.some(pid => person.parentIds?.includes(pid))) {
    return person.gender === 'f' ? 'sister' : person.gender === 'm' ? 'brother' : 'sibling';
  }
  // Grandparent + fallback...
};
```

**TS port** (RESEARCH.md Pattern 4 — return `{ kind, qualifier? }` not a single string; uses Phase 2 store-typed `Person`):
```typescript
import type { Person } from '@/lib/store/tree-store';

export type RelationKind = 'self' | 'parent' | 'spouse' | 'child' | 'sibling' | 'relative';
export type RelationHint = { kind: RelationKind; qualifier?: string };

export function relationFrom(
  people: Record<string, Person>,
  fromId: string,
  toId: string,
): RelationHint {
  if (fromId === toId) return { kind: 'self', qualifier: 'YOU' };
  const from = people[fromId];
  const to = people[toId];
  if (!from || !to) return { kind: 'relative' };

  if (from.spouseIds.includes(toId)) return { kind: 'spouse', qualifier: 'OF YOU' };
  if (from.parentIds.includes(toId)) return { kind: 'parent', qualifier: 'OF YOU' };
  if (from.childIds.includes(toId)) return { kind: 'child', qualifier: 'OF YOU' };
  if (from.parentIds.some(pid => to.parentIds.includes(pid))) {
    return { kind: 'sibling', qualifier: 'OF YOU' };
  }
  // BFS up to 4 hops for grandparent / in-law / etc — fallback to 'relative'
  return { kind: 'relative' };
}
```

**Note:** Phase 3 search palette format is `{KIND} · {QUALIFIER}` per UI-SPEC §"Search Palette" — `PARENT · OF YOU`, `SPOUSE · OF ALICE`, etc.

---

### `lib/graph/relations.test.ts` (NEW — test, unit)

**Analog:** `lib/graph/edges.test.ts` (same layout — Vitest unit tests for pure utilities).

Same import shape as `placement.test.ts`. Cover: self, direct (spouse/parent/child/sibling), in-law, no-relation, grandparent fallback.

---

### `app/actions/people.ts` MODIFIED (server action, request-response)

**Analog:** (self) — `updatePerson` / `movePerson` / `removePerson` at L17-73 follow an identical pattern.

**Existing pattern** (copy from `app/actions/people.ts` L17-35 — `'use server'` is at file top L1; pattern is `getUserIdOrThrow` → `Zod parse if applicable` → `supabaseServer()` → `RLS-trusted call` → `error wrap with prefixed message`):
```typescript
'use server';

import { getUserIdOrThrow } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { PersonPatchSchema, toDbPatch, type PersonPatch } from '@/lib/schemas/person';

export async function updatePerson(
  treeId: string,
  personId: string,
  patch: PersonPatch,
): Promise<void> {
  await getUserIdOrThrow();
  const parsed = PersonPatchSchema.parse(patch);
  const dbPatch = toDbPatch(parsed);
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('people')
    .update(dbPatch)
    .eq('id', personId)
    .eq('tree_id', treeId);
  if (error) {
    throw new Error(`updatePerson failed: ${error.message}`);
  }
}
```

**Phase 3 `addPerson` shape** (RESEARCH.md Code Example C — recommended path: SECURITY DEFINER RPC for atomicity per CONTEXT.md D-09 + Open Q #1):
```typescript
export async function addPerson(
  treeId: string,
  kind: 'parent' | 'spouse' | 'child' | 'sibling',
  anchorId: string,
  position: { x: number; y: number },
): Promise<{ id: string; /* ...person fields */ }> {
  await getUserIdOrThrow();
  const supabase = await supabaseServer();
  // Recommended: call SECURITY DEFINER RPC for atomic insert + symmetric anchor patch
  const { data, error } = await supabase.rpc('add_person_with_relation', {
    p_tree_id: treeId,
    p_kind: kind,
    p_anchor_id: anchorId,
    p_pos_x: position.x,
    p_pos_y: position.y,
  });
  if (error) {
    // Threat model T-02-04: never leak hint/details/code
    throw new Error(`addPerson failed: ${error.message}`);
  }
  return data; // RPC returns the new row
}
```

**Threat-model lock** (copy from `app/actions/people.ts` L31-34 comment + L33-34 error-message-only): "Only message — never hint/details/code (threat model T-02-04 leakage)."

**Cycle / parent-cap rejections:** server-side via existing `creates_parent_cycle()` SQL function (Phase 1 DATA-07) and `parent_ids` CHECK (DATA-06). RPC propagates the rejection as Postgres error → client surfaces toast `Couldn't add {kind} — would create a cycle` / `Couldn't add parent — already has two` per UI-SPEC §"Error States".

**Alternative path** (if planner rejects RPC): two-write pattern with compensating delete per RESEARCH.md Code Example C — flagged as Assumption A1 risk. Recommendation: ship the RPC.

---

### `supabase/migrations/<n>_add_person_with_relation.sql` (NEW — migration; recommended per Open Q #1)

**Analog:** existing `bootstrap_tree` SECURITY DEFINER RPC in `supabase/migrations/20260421000000_initial_schema.sql` (precedent for atomic multi-write Server Actions per CONTEXT.md D-05 + RESEARCH.md Code Example C note).

**Pattern** (per Open Q #1 + DATA-09 RPC convention):
```sql
CREATE OR REPLACE FUNCTION add_person_with_relation(
  p_tree_id uuid,
  p_kind text,
  p_anchor_id uuid,
  p_pos_x numeric,
  p_pos_y numeric
) RETURNS people
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_anchor people;
  v_new_id uuid := gen_random_uuid();
  v_new people;
BEGIN
  -- Read anchor with RLS bypassed (SECURITY DEFINER) but enforce membership
  -- via explicit join on tree_members. Fail closed on RLS-equivalent check.
  SELECT * INTO v_anchor FROM people WHERE id = p_anchor_id AND tree_id = p_tree_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'anchor not found'; END IF;

  -- Insert + relation patch in single transaction
  INSERT INTO people (id, tree_id, name, gender, x, y, is_me,
    parent_ids, spouse_ids, child_ids)
  VALUES (v_new_id, p_tree_id, '', 'u', p_pos_x, p_pos_y, false,
    CASE WHEN p_kind = 'child' THEN ARRAY[p_anchor_id]::uuid[]
         WHEN p_kind = 'sibling' THEN COALESCE(v_anchor.parent_ids, '{}')
         ELSE '{}'::uuid[] END,
    CASE WHEN p_kind = 'spouse' THEN ARRAY[p_anchor_id]::uuid[] ELSE '{}'::uuid[] END,
    CASE WHEN p_kind = 'parent' THEN ARRAY[p_anchor_id]::uuid[] ELSE '{}'::uuid[] END
  ) RETURNING * INTO v_new;

  -- Patch anchor's symmetric relation array
  UPDATE people SET
    parent_ids = CASE WHEN p_kind = 'parent' THEN array_append(parent_ids, v_new_id) ELSE parent_ids END,
    spouse_ids = CASE WHEN p_kind = 'spouse' THEN array_append(spouse_ids, v_new_id) ELSE spouse_ids END,
    child_ids  = CASE WHEN p_kind = 'child'  THEN array_append(child_ids, v_new_id)  ELSE child_ids  END
  WHERE id = p_anchor_id AND tree_id = p_tree_id;

  RETURN v_new;
END $$;
```

**Cycle / parent-cap:** trigger-enforced via existing `creates_parent_cycle()` (DATA-07) and CHECK constraint (DATA-06) — RPC inherits both.

---

### `e2e/phase-3-demo-path.spec.ts` (NEW — test, end-to-end)

**Analog:** none in repo yet (Phase 2 ships HUMAN-UAT items in `02-HUMAN-UAT.md`, no Playwright code). Researcher confirms `playwright.config.ts` exists; this is the first authored E2E spec.

**Pattern reference:** `playwright.config.ts` (root), CONTEXT.md demo path step list:
> sign in → select You → `+` → **Parent** → name → `+` → **Child** → name → ⌘Z (reverts) → ⌘⇧Z (replays) → drag → ⌘Z (one entry) → ⌘K → search → Enter → centers → **Remove** → toast `Removed X · Undo` → click Undo.

**Suggested layout** (follows Playwright conventions; planner can adjust):
```typescript
import { test, expect } from '@playwright/test';

test('Phase 3 demo path: add → undo → redo → drag-undo → search → remove → undo', async ({ page }) => {
  // 1. Sign in (Clerk dev session helper)
  // 2. Navigate to seed tree
  // 3. Click YOU node + button → click Parent slice → fill name → blur
  // 4. Verify parent node appears, edge renders
  // 5. ⌘Z → assert parent removed
  // 6. ⌘⇧Z → assert parent re-added
  // ... etc per CONTEXT.md demo path
});
```

---

## Shared Patterns

These cross-cutting patterns apply across multiple Phase 3 files. Each plan's action section should reference them rather than re-specifying.

### Tailwind v4 + handoff CSS variables

**Source:** `app/globals.css` (`@theme` block — handoff `:root` mapped 1:1) + every existing canvas component.
**Apply to:** All new components (`RadialMenu`, `Toolbar`, `SearchPalette`, `ToastHost`, `Toast`, `Modal`).

**Pattern** (verbatim from `components/canvas/PersonNode.tsx` L142-156):
```typescript
className={cn(
  'absolute flex items-center bg-bg-card select-none',
  'w-[180px] h-[76px]',
  ...
)}
style={{
  background: 'var(--ink)',  // for properties Tailwind doesn't surface
  boxShadow: '4px 4px 0 var(--ink)',
  border: '1px solid var(--ink)',
}}
```
**Rule:** every color comes from `@theme` CSS variables. NO hard-coded OKLCH in components. Phase 3 introduces ZERO new tokens (`--accent-soft` already exists; consume via `style={{ background: 'var(--accent-soft)' }}`).

---

### Zustand selector + useShallow rule

**Source:** `components/canvas/PanZoomWrapper.tsx` L99-115 (per-slice selectors + `useShallow` for collection selectors).
**Apply to:** `Toolbar`, `SearchPalette`, `ToastHost`, `useSaveErrorToast`, `useTreeKeyboard`, modified `PersonNode`/`SidePanel`.

**Per-slice selector pattern:**
```typescript
const radialOpenFor = useTreeStore((s) => s.radialOpenFor);
const setRadialOpenFor = useTreeStore((s) => s.setRadialOpenFor);
```

**Collection selector pattern** (mandatory per quick-task 260422-9vu fix — selectors that return a fresh array MUST wrap with `useShallow` to avoid the `getServerSnapshot should be cached` infinite loop):
```typescript
import { useShallow } from 'zustand/shallow';

const sortedPeople = useTreeStore(useShallow((s) =>
  Object.values(s.people).sort((a, b) => a.name.localeCompare(b.name))
));
```

**Imperative-read pattern** (for window listeners / event handlers that need fresh state, not selector subscriptions):
```typescript
const storeApi = useTreeStoreApi();
// Inside listener:
const finalPerson = storeApi.getState().people[ds.id];
storeApi.temporal.getState().undo();
```

---

### Server Action template

**Source:** `app/actions/people.ts` L1-73 (every existing action).
**Apply to:** new `addPerson` (and any future server action this phase touches).

**Boilerplate** (copy from L1-35):
```typescript
'use server';

import { getUserIdOrThrow } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
// + Zod schema imports for parameter validation

export async function actionName(/* typed params */): Promise<ResultType> {
  await getUserIdOrThrow();
  // OPTIONAL: const parsed = SomeSchema.parse(input);
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('table')           // OR .rpc('rpc_name', { ... })
    .doSomething()
    .eq('id', id)
    .eq('tree_id', treeId);  // defense-in-depth equality predicate
  if (error) throw new Error(`actionName failed: ${error.message}`);
  return data;
}
```

**Threat-model rule** (per `app/actions/people.ts` L32-33 comment): NEVER bubble Supabase `error.hint`, `error.details`, `error.code` to the client. Only `error.message` after wrapping with the action's prefix. Client receives sanitized strings.

---

### Subscribed-overlay component shape

**Source:** `components/canvas/SaveErrorToast.tsx` (entire file — 109 LOC).
**Apply to:** `ToastHost`, `Toast` (refactor target), `RadialMenu` (subscription to `radialOpenFor`), `SearchPalette` (subscription to `searchOpen`).

**Pattern:** subscribe narrowly, render `null` when off, manage own dismiss state via `useEffect` with `clearTimeout` cleanup. Mount at the canvas root level (NOT inside conditional panels) so events trigger UI even without focus on the originating element.

---

### Esc handler + scope gate

**Source:** `components/canvas/PanZoomWrapper.tsx` L293-305.
**Apply to:** `RadialMenu`, `SearchPalette`, `Modal`, `useTreeKeyboard`.

**Pattern:**
```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' /* or other key */) return;
    const tag = (e.target as Element | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    // dispatch action
  };
  window.addEventListener('keydown', onKey);
  return () => { window.removeEventListener('keydown', onKey); };
}, [/* deps */]);
```

**Phase 3 extension:** also gate on `(ae as HTMLElement | null)?.isContentEditable` per A11Y-02 + RESEARCH.md Pattern 3.

---

### Optimistic-local + server-reconcile + revert-on-error

**Source:** `components/canvas/PanZoomWrapper.tsx` L197-225 (drag-save with rollback).
**Apply to:** `addPerson` flow in radial menu, `removePerson` flow in SidePanel handleRemove, undo/redo replay through useSaveQueue.

**Pattern** (verbatim from PanZoomWrapper L197-225, generalized):
```typescript
// 1. Capture pre-state for rollback
const snapshot = { x: ds.origX, y: ds.origY };
// 2. Optimistic local commit (already done before this point)
// 3. Pill: 'saving'
setSaveState(id, 'saving');
// 4. Fire server action
movePerson(treeId, id, x, y)
  .then(() => {
    setSaveState(id, 'saved');
    setTimeout(() => {
      if (storeApi.getState().saveStateByPersonId[id] === 'saved') {
        setSaveState(id, 'idle');
      }
    }, SAVED_TO_IDLE_MS);
  })
  .catch(() => {
    // Revert local + flip pill red — SaveErrorToast / ToastHost picks it up
    setPersonPosition(id, snapshot.x, snapshot.y);
    setSaveState(id, 'error');
  });
```

---

### Pure-utility test layout

**Source:** `lib/graph/edges.test.ts` L1-57.
**Apply to:** `lib/graph/placement.test.ts`, `lib/graph/relations.test.ts`.

**Pattern:**
```typescript
import { describe, it, expect } from 'vitest';
import { fnUnderTest, OTHER_EXPORT } from '@/lib/graph/module';

describe('fnUnderTest', () => {
  it('handles base case', () => { /* ... */ });
  it('handles edge case 1', () => { /* ... */ });
  it('does not throw on degenerate input', () => { /* ... */ });
});
```
No mocking, no setup files, no fixtures. Pure-input/pure-output asserts.

---

## No Analog Found

Files with no close match in the existing codebase. Planner should rely on RESEARCH.md patterns + handoff source for these.

| File | Role | Data Flow | Reason | Fallback |
|------|------|-----------|--------|----------|
| `components/ui/Modal.tsx` | component (generic primitive) | event-driven | First reusable modal; SidePanel is a docked aside, not a centered modal | Use handoff `.modal` styles in `design_handoff_family_tree/source/styles.css` L408-450 + Modal API shape from UI-SPEC §Component Inventory |
| `e2e/phase-3-demo-path.spec.ts` | test (E2E) | end-to-end | First Playwright spec authored in repo | Use `playwright.config.ts` defaults + CONTEXT.md demo path step list |
| `supabase/migrations/<n>_add_person_with_relation.sql` | migration (DDL) | DDL | First Phase 3 migration; precedent is `bootstrap_tree` RPC in initial migration | Pattern in RESEARCH.md Code Example C note + Open Q #1 recommendation |
| `lib/hooks/useTreeKeyboard.ts` | hook (listener) | event-driven | First multi-shortcut listener (existing Esc handler is single-key inline in PanZoomWrapper) | Pattern derived from PanZoomWrapper L293-305 + RESEARCH.md Pattern 3 |

---

## Metadata

**Analog search scope:**
- `components/canvas/` (10 files)
- `components/shell/` (8 files)
- `components/ui/` (does not exist yet — will be created in Phase 3)
- `lib/store/`, `lib/hooks/`, `lib/graph/`, `lib/utils/`, `lib/schemas/`, `lib/supabase/`, `lib/auth.ts`
- `app/actions/people.ts`, `app/(app)/tree/[treeId]/page.tsx`
- `design_handoff_family_tree/source/` (app.jsx, components.jsx, model.jsx, styles.css)
- `supabase/migrations/`

**Files scanned:** 30 (in-repo) + 4 (handoff reference)

**Pattern extraction date:** 2026-05-07

**Key cross-cutting observations:**
1. **Every existing canvas component is a "subscribed overlay" or "subscribed visual"** — Phase 3's new overlays (`RadialMenu`, `SearchPalette`, `ToastHost`) follow the same shape: narrow Zustand subscription → render `null` if off → manage own lifecycle.
2. **Zustand store factory + immer + per-slice selectors is the project's spine** — Phase 3 just adds 4 new state fields and 5 new actions to the existing slice; the temporal middleware was reserved for this phase.
3. **Server Actions follow a strict template** (`'use server'` + auth + Zod parse + supabaseServer + RLS-trusted call + sanitized error). `addPerson` is one more entry in the same file.
4. **Pure utilities live in `lib/graph/` with corresponding `.test.ts` Vitest specs** — `placement` and `relations` slot in next to `edges`.
5. **Tailwind v4 + handoff CSS variables** is the exclusive styling path. NO new tokens in Phase 3 (`--accent-soft` already exists from handoff).
