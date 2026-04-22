'use client';

import { useMemo } from 'react';
import { useTreeStore } from '@/lib/store/tree-store';
import { NODE_W, NODE_H, computeEdges, spousePath, parentPath } from '@/lib/graph/edges';

// Padding around the people bbox so path tails never clip. 400px comfortably
// exceeds any orthogonal parent-edge detour at typical spacings.
const BBOX_PADDING = 400;

/**
 * Single SVG overlay that draws every spouse + parent-child edge derived
 * from the store's `people` record. Purely transformational — re-renders
 * once per people mutation (O(n) recompute), which stays within the
 * EDGE-06 60fps budget for 200 nodes.
 *
 * Key rendering choices:
 *  - ONE `<svg>` element for the whole tree (NOT one per edge) — per
 *    EDGE-02. Keeps DOM node count tied to edges, not edge-parts.
 *  - `overflow: 'visible'` so paths routed past the bbox still paint.
 *  - `pointer-events: 'none'` so edges don't steal mousedown from nodes
 *    or the canvas pan surface beneath.
 *  - `vector-effect="non-scaling-stroke"` on every path — stroke width
 *    stays 1.5px / 2px regardless of `transform.k` (REQ EDGE-05).
 *  - Spouse paths render with `stroke="var(--accent)"` @ 2px; parent
 *    paths with `stroke="var(--ink)"` @ 1.5px (UI-SPEC §8).
 *  - O(1) `peopleRecord[id]` lookups inside the render loop — never
 *    `.find()` on an array.
 */
export default function EdgeLayer() {
  const peopleRecord = useTreeStore((s) => s.people);

  // Object.values pass is O(n); memoized against the record identity so
  // drag-move mutations (which change one person in place via immer) still
  // produce a new record and re-derive the array once.
  const peopleArray = useMemo(() => Object.values(peopleRecord), [peopleRecord]);

  const edges = useMemo(() => computeEdges(peopleArray), [peopleArray]);

  const bbox = useMemo(() => {
    if (peopleArray.length === 0) {
      return { minX: 0, minY: 0, w: 2000, h: 2000 };
    }
    const xs = peopleArray.map((p) => p.x);
    const ys = peopleArray.map((p) => p.y);
    const minX = Math.min(...xs) - BBOX_PADDING;
    const minY = Math.min(...ys) - BBOX_PADDING;
    const maxX = Math.max(...xs) + NODE_W + BBOX_PADDING;
    const maxY = Math.max(...ys) + NODE_H + BBOX_PADDING;
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [peopleArray]);

  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: bbox.minX,
        top: bbox.minY,
        overflow: 'visible',
        pointerEvents: 'none',
      }}
      width={bbox.w}
      height={bbox.h}
      viewBox={`${bbox.minX} ${bbox.minY} ${bbox.w} ${bbox.h}`}
    >
      {edges.map((e, i) => {
        const a = peopleRecord[e.a];
        const b = peopleRecord[e.b];
        // Defensive: if the ref-target person isn't hydrated (race during
        // optimistic removal), skip the edge rather than throw.
        if (!a || !b) return null;
        if (e.kind === 'spouse') {
          return (
            <path
              key={`s-${e.a}-${e.b}`}
              d={spousePath(a, b)}
              stroke="var(--accent)"
              strokeWidth={2}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          );
        }
        return (
          <path
            key={`p-${e.a}-${e.b}-${i}`}
            d={parentPath(a, b)}
            stroke="var(--ink)"
            strokeWidth={1.5}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
