'use client';

import { useEffect } from 'react';
import { useTreeStore, type PersonRowDb } from '@/lib/store/tree-store';
import EmptyTreeOverlay from '@/components/shell/EmptyTreeOverlay';
import PanZoomWrapper from './PanZoomWrapper';

// The RSC (`app/(app)/tree/[treeId]/page.tsx`) selects only the columns
// `personFromRow` reads — it omits `created_at`, `tree_id`, `updated_at`
// to keep the payload lean. This alias mirrors that narrower shape so the
// prop type matches what the RSC actually returns. `personFromRow` never
// touches the omitted columns, so hydrate is still structurally safe.
export type TreeCanvasPersonRow = Omit<
  PersonRowDb,
  'created_at' | 'tree_id' | 'updated_at'
>;

type TreeCanvasProps = {
  tree: { id: string; name: string; owner_user_id: string };
  people: TreeCanvasPersonRow[];
};

/**
 * Client-component root of the Phase 2 canvas.
 *
 *  1. Hydrates the Zustand store from the RSC-fetched people rows (snake_case
 *     → camelCase happens inside `hydratePeople` via `personFromRow`).
 *  2. Sets the tree id on the store.
 *  3. Resets the viewport transform to the REQ CANV-05 initial value
 *     `{ x: 400, y: 180, k: 1 }` so the seed YOU node lands at screen
 *     (400, 180) on first paint.
 *  4. Mounts <PanZoomWrapper> (owns pan/zoom/drag + node + edge rendering).
 *  5. Mounts <EmptyTreeOverlay> outside the transform wrapper — the overlay
 *     is a fixed screen-space greeting (Phase 1 UI) and MUST NOT be zoomed
 *     or translated with the canvas.
 *
 * Deps on `[tree.id]` so switching trees re-seeds the store cleanly.
 */
export default function TreeCanvas({ tree, people }: TreeCanvasProps) {
  const hydratePeople = useTreeStore((s) => s.hydratePeople);
  const setTreeId = useTreeStore((s) => s.setTreeId);
  const setTransform = useTreeStore((s) => s.setTransform);
  const peopleCount = useTreeStore((s) => Object.keys(s.people).length);

  useEffect(() => {
    // `people` is a structural subset of PersonRowDb (omitting columns the
    // hydrate path never reads). Cast is safe because `personFromRow` only
    // touches the fields present in `TreeCanvasPersonRow`.
    hydratePeople(people as unknown as PersonRowDb[]);
    setTreeId(tree.id);
    setTransform({ x: 400, y: 180, k: 1 });
    // Intentionally does NOT list `people` in deps — the array identity
    // changes per request even when rows are identical. Switching trees
    // (tree.id change) is the correct re-seed trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.id]);

  return (
    <>
      <PanZoomWrapper tree={tree} />
      {peopleCount <= 1 && <EmptyTreeOverlay />}
    </>
  );
}
