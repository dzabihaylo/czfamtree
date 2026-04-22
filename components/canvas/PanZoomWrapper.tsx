'use client';

import { useEffect, useRef, useState } from 'react';
import { useTreeStore } from '@/lib/store/tree-store';
import { cn } from '@/lib/utils/cn';
import EdgeLayer from './EdgeLayer';
import PersonNode from './PersonNode';

// ────────────────────────────────────────────────────────────────────────────
// Phase 2 transform constants — locked by REQ CANV-06 + UI-SPEC §3. Declared
// at module scope (not imported from a shared module) because they belong to
// the transform subsystem owned by this file. Changing them changes the zoom
// feel globally; that is intentionally a PanZoomWrapper-local decision.
// ────────────────────────────────────────────────────────────────────────────
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const WHEEL_SENSITIVITY = 0.0015;

type PanZoomWrapperProps = {
  tree: { id: string };
};

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
 * classnames — Shared Pattern 7) so this wrapper stays decoupled from the
 * downstream components' styling.
 *
 * **Wheel listener registration:** `addEventListener('wheel', ..., { passive:
 * false })` via useEffect — React 17+ marks its synthetic `onWheel` passive,
 * which blocks `e.preventDefault()` (required by REQ CANV-04 to stop the
 * browser's default scroll-page behavior under ⌘/Ctrl-scroll).
 *
 * Drag branches (3px threshold, movePerson persistence) land in Task 3 of
 * this plan — the onMove/onUp closures below have placeholder comments where
 * the drag code slots in.
 */
export default function PanZoomWrapper({ tree: _tree }: PanZoomWrapperProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Narrow per-slice selectors — transform changes do not force re-renders
  // of components that only care about selection, and vice versa.
  const transform = useTreeStore((s) => s.transform);
  const setTransform = useTreeStore((s) => s.setTransform);
  const setSelectedPersonId = useTreeStore((s) => s.setSelectedPersonId);
  const setSidePanelOpen = useTreeStore((s) => s.setSidePanelOpen);
  const peopleIds = useTreeStore((s) => Object.keys(s.people));

  const [panning, setPanning] = useState(false);
  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);

  // Pan mousedown — only starts on empty canvas (not on nodes, sidepanel,
  // or topbar). Clicking empty canvas also deselects per SEL-01.
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
      // Task 3 of this plan inserts a drag branch HERE that takes priority
      // over pan. For Task 1 we handle only the pan case.
      if (panning && panStart.current) {
        setTransform({
          x: panStart.current.tx + (e.clientX - panStart.current.x),
          y: panStart.current.ty + (e.clientY - panStart.current.y),
          k: transform.k,
        });
      }
    };
    const onUp = () => {
      // Task 3 inserts drag-end commit (movePerson call) HERE before the
      // pan reset below.
      setPanning(false);
      panStart.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [panning, transform.x, transform.y, transform.k, setTransform]);

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
          <PersonNode key={id} personId={id} treeId={_tree.id} />
        ))}
      </div>
    </section>
  );
}
