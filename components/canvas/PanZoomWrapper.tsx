'use client';

import {
  createContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { useTreeStore, useTreeStoreApi } from '@/lib/store/tree-store';
import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils/cn';
import { movePerson } from '@/app/actions/people';
import EdgeLayer from './EdgeLayer';
import PersonNode from './PersonNode';

// ────────────────────────────────────────────────────────────────────────────
// Phase 2 transform + drag constants — locked by REQ CANV-06 + UI-SPEC §3/§4.
// Declared at module scope (not imported from a shared module) because they
// belong to the transform subsystem owned by this file. Changing them changes
// the zoom / drag feel globally; that is intentionally a PanZoomWrapper-local
// decision.
// ────────────────────────────────────────────────────────────────────────────
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const WHEEL_SENSITIVITY = 0.0015;
const DRAG_THRESHOLD_PX = 3;
// Pill "saved" → "idle" dwell time per UI-SPEC §7 rule 5. A new edit arriving
// inside this window skips back to 'saving' (guarded by the read-back check
// in the setTimeout callback).
const SAVED_TO_IDLE_MS = 1400;

type PanZoomWrapperProps = {
  tree: { id: string };
};

/**
 * Drag state the PersonNode seeds on mousedown. PanZoomWrapper owns the
 * window-level mousemove/mouseup listeners that consume it.
 *
 *  - `startX` / `startY` are in SCREEN pixels (from MouseEvent.clientX/Y).
 *  - `origX` / `origY` are in WORLD coordinates (the person's stored x/y).
 *  - Deltas are divided by `transform.k` in the mousemove handler so drag
 *    feels 1:1 with the cursor at any zoom level (UI-SPEC §4).
 */
export type DragState = {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
};

/**
 * Context exposed by PanZoomWrapper so descendent PersonNodes can seed the
 * drag ref on mousedown without prop-drilling. Task 4's <PersonNode> reads
 * this context and writes `dragStateRef.current = { id, startX, ... }` inside
 * its own mousedown handler BEFORE calling setSelectedPersonId — which means
 * a bare click-then-release selects without ever crossing the 3px threshold.
 */
export const DragStateContext = createContext<{
  dragStateRef: MutableRefObject<DragState | null>;
} | null>(null);

/**
 * Owner of the canvas viewport:
 *
 *  - 52px-offset <section role="region"> surface that catches pan mousedown,
 *    wheel zoom, and escape-to-deselect.
 *  - Inner translate(x,y) scale(k) wrapper that renders EdgeLayer + every
 *    PersonNode. Grid lives on the inner wrapper (via `.grid-bg`) so dots
 *    pan and scale with the world (D-08 / UI-SPEC Reconciliation row 2).
 *
 * **Pan vs drag contract:** pan starts ONLY if the mousedown target is NOT
 * inside a node, sidepanel, or topbar. We probe via `data-node`,
 * `data-sidepanel`, and `data-topbar` attribute selectors (NOT handoff
 * classnames — Shared Pattern 7). When PersonNode seeds the drag ref in
 * the same mousedown, the window-level mousemove prefers the drag branch
 * over the pan branch.
 *
 * **Drag persistence:** on mouseup after the threshold was crossed, the
 * final world position is read via `storeApi.getState().people[id]` and
 * committed via the `movePerson` Server Action. Pill state moves
 * idle → saving → saved (1.4s) → idle, or → error with an automatic
 * position revert on failure. Plan 03's <SavePill> and <SaveErrorToast>
 * subscribe to these state transitions. Does NOT engage zundo temporal
 * history (D-06 — Phase 3 wires HIST-05).
 *
 * **Wheel listener registration:** `addEventListener('wheel', ..., { passive:
 * false })` via useEffect — React 17+ marks its synthetic `onWheel` passive,
 * which blocks `e.preventDefault()` (required by REQ CANV-04 to stop the
 * browser's default scroll-page behavior under ⌘/Ctrl-scroll).
 */
export default function PanZoomWrapper({ tree }: PanZoomWrapperProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Narrow per-slice selectors — transform changes do not force re-renders
  // of components that only care about selection, and vice versa.
  const transform = useTreeStore((s) => s.transform);
  const setTransform = useTreeStore((s) => s.setTransform);
  const setSelectedPersonId = useTreeStore((s) => s.setSelectedPersonId);
  const setSidePanelOpen = useTreeStore((s) => s.setSidePanelOpen);
  const setDragging = useTreeStore((s) => s.setDragging);
  const setPersonPosition = useTreeStore((s) => s.setPersonPosition);
  const setSaveState = useTreeStore((s) => s.setSaveState);
  // useShallow stabilises the array reference across renders — Object.keys()
  // returns a freshly-allocated array each call, which Zustand 5's default
  // Object.is equality treats as a changed snapshot and loops forever. The
  // shallow comparator diffs element-wise, so the array identity only
  // changes when the person-id set actually changes.
  const peopleIds = useTreeStore(useShallow((s) => Object.keys(s.people)));

  // Raw store API for imperative reads inside window listeners — avoids
  // stale closures on transform.k, people[id], and saveStateByPersonId.
  const storeApi = useTreeStoreApi();

  const treeId = tree.id;

  const [panning, setPanning] = useState(false);
  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);

  // Shared with PersonNode via DragStateContext — PersonNode's mousedown
  // seeds this ref; PanZoomWrapper's window listeners consume it.
  const dragStateRef = useRef<DragState | null>(null);
  // True once the 3px threshold has been crossed for the current drag.
  const draggingActiveRef = useRef(false);

  // Pan mousedown — only starts on empty canvas (not on nodes, sidepanel,
  // or topbar). Clicking empty canvas also deselects per SEL-01. Note: this
  // handler is bypassed for node clicks because PersonNode calls
  // e.stopPropagation() in its own mousedown (Task 4).
  const onCanvasMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const target = e.target as Element | null;
    if (!target) return;
    if (
      target.closest('[data-node]') ||
      target.closest('[data-sidepanel]') ||
      target.closest('[data-topbar]')
    ) {
      return;
    }
    setPanning(true);
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y,
    };
    setSelectedPersonId(null);
  };

  // Window-level mousemove + mouseup so dragging beyond the viewport still
  // tracks. Effect re-registers when panning toggles or the captured
  // transform scalars change (captured inside the handler closure).
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Drag branch takes priority over pan — if PersonNode seeded the drag
      // ref on mousedown, treat the gesture as a drag regardless of whether
      // panning was also armed (it shouldn't be, because PersonNode
      // stopPropagation's the mousedown before the section handler fires).
      if (dragStateRef.current) {
        const ds = dragStateRef.current;
        const dx = (e.clientX - ds.startX) / transform.k;
        const dy = (e.clientY - ds.startY) / transform.k;
        const moved = Math.abs(dx) + Math.abs(dy);
        // 3px threshold (UI-SPEC §4) — flip to the drag visual state once
        // the user has committed to a drag. Bare click-then-release stays
        // below threshold and is treated as a pure selection click.
        if (!draggingActiveRef.current && moved >= DRAG_THRESHOLD_PX) {
          draggingActiveRef.current = true;
          setDragging(ds.id, { x: ds.origX, y: ds.origY });
        }
        if (draggingActiveRef.current) {
          setPersonPosition(ds.id, ds.origX + dx, ds.origY + dy);
        }
        return;
      }
      if (panning && panStart.current) {
        setTransform({
          x: panStart.current.tx + (e.clientX - panStart.current.x),
          y: panStart.current.ty + (e.clientY - panStart.current.y),
          k: transform.k,
        });
      }
    };
    const onUp = () => {
      // Drag-end commit — only when the threshold was crossed. Bare click
      // never enters this branch (dragStateRef is still set but
      // draggingActiveRef is false), so the click path's select semantics
      // stay in PersonNode.
      if (dragStateRef.current && draggingActiveRef.current) {
        const ds = dragStateRef.current;
        const finalPerson = storeApi.getState().people[ds.id];
        // Clear the drag visual IMMEDIATELY so a slow network doesn't leave
        // the node stuck in the dragging shadow. The save pipeline still
        // runs against the captured final position.
        setDragging(null);
        draggingActiveRef.current = false;
        if (finalPerson) {
          const { x, y } = finalPerson;
          setSaveState(ds.id, 'saving');
          movePerson(treeId, ds.id, x, y)
            .then(() => {
              setSaveState(ds.id, 'saved');
              setTimeout(() => {
                // Only step back to 'idle' if still 'saved' — a subsequent
                // edit may have already moved it to 'saving' or 'error'.
                if (storeApi.getState().saveStateByPersonId[ds.id] === 'saved') {
                  setSaveState(ds.id, 'idle');
                }
              }, SAVED_TO_IDLE_MS);
            })
            .catch(() => {
              // Optimistic revert + pill red; Plan 03's <SaveErrorToast>
              // subscribes to 'error' and surfaces the toast copy
              // "Couldn't save move for {name}" (UI-SPEC Copywriting).
              setPersonPosition(ds.id, ds.origX, ds.origY);
              setSaveState(ds.id, 'error');
            });
        }
      } else if (dragStateRef.current) {
        // No threshold crossed — nothing to persist. Just clear the drag
        // slot so the next mousedown starts fresh.
        draggingActiveRef.current = false;
      }
      dragStateRef.current = null;
      setPanning(false);
      panStart.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [
    panning,
    transform.x,
    transform.y,
    transform.k,
    setTransform,
    setDragging,
    setPersonPosition,
    setSaveState,
    storeApi,
    treeId,
  ]);

  // Wheel zoom — cursor-anchored under ⌘/Ctrl (CANV-04/06), two-finger
  // trackpad pan otherwise. Must be registered via `addEventListener` with
  // `{ passive: false }` so `preventDefault()` takes effect.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const delta = -e.deltaY * WHEEL_SENSITIVITY;
        const newK = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, transform.k * (1 + delta)));
        const kRatio = newK / transform.k;
        setTransform({
          k: newK,
          x: mx - (mx - transform.x) * kRatio,
          y: my - (my - transform.y) * kRatio,
        });
      } else {
        // Two-finger trackpad pan (macOS) per CANV-04
        setTransform({
          x: transform.x - e.deltaX,
          y: transform.y - e.deltaY,
          k: transform.k,
        });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [transform.x, transform.y, transform.k, setTransform]);

  // Escape: deselect + close side panel. Skips when an INPUT/TEXTAREA owns
  // focus so native input behaviour (clear search, close date picker, etc.)
  // is unaffected (SEL-02).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as Element | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      setSelectedPersonId(null);
      setSidePanelOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [setSelectedPersonId, setSidePanelOpen]);

  return (
    <DragStateContext.Provider value={{ dragStateRef }}>
      <section
        ref={canvasRef}
        aria-label="Family tree canvas"
        role="region"
        tabIndex={0}
        className={cn(
          'absolute inset-0 overflow-hidden select-none',
          panning ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={{ top: 52 }}
        onMouseDown={onCanvasMouseDown}
      >
        <div
          className="absolute top-0 left-0 grid-bg will-change-transform"
          style={{
            transformOrigin: '0 0',
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          }}
        >
          <EdgeLayer />
          {peopleIds.map((id) => (
            <PersonNode key={id} personId={id} treeId={treeId} />
          ))}
        </div>
      </section>
    </DragStateContext.Provider>
  );
}
