'use client';

import { useContext } from 'react';
import { Plus } from 'lucide-react';
import { useTreeStore } from '@/lib/store/tree-store';
import { cn } from '@/lib/utils/cn';
import AvatarCircle from './AvatarCircle';
import { DragStateContext } from './PanZoomWrapper';

type Props = {
  personId: string;
  // Accepted for Plan 03's save-pipeline convenience (consumers that pass
  // treeId into the node can proxy it down to nested actions). Phase 2 itself
  // does not use treeId inside the node — mutations go through
  // PanZoomWrapper's window listeners.
  treeId: string;
};

/**
 * 180×76 compact person card per REQ NODE-01. Composition:
 *
 *  ┌──┬──────────────────────────────┐
 *  │  │  Name (13px semibold)        │   [YOU ribbon if is_me]
 *  │• │  1981 – 2019 (11px mono)     │
 *  └──┴──────────────────────────────┘
 *         │
 *         └── [+] (selected only, 28×28 --accent, 2px 2px 0 --ink shadow)
 *
 *  - Left 4px: gender accent stripe (`--gender-m|f|x|u`).
 *  - 40px AvatarCircle with ID-hashed color (gender is surfaced by the
 *    stripe; avatar color is stable per person across gender edits).
 *  - Name + years text column (ink / ink-2).
 *  - `YOU` ribbon top-right when is_me === true.
 *  - Selected state: 2px --accent border + `0 0 0 2px var(--accent),
 *    4px 4px 0 var(--accent)` stacked shadow + bottom-center + button.
 *  - Dragging state: `6px 6px 0 var(--ink)` shadow + z-index 100.
 *
 * **Store subscriptions are narrow** (D-10): subscribe to `people[personId]`
 * and per-person flags so one node's drag-move re-renders only that node,
 * not the whole list. Ties into EDGE-06's 60fps budget at 200 nodes.
 *
 * **Drag seeding:** mousedown writes to DragStateContext's dragStateRef
 * BEFORE calling setSelectedPersonId. PanZoomWrapper's window mousemove
 * reads the ref, enforces the 3px threshold, and commits via movePerson
 * on mouseup. Bare clicks never cross the threshold so selection is
 * orthogonal to drag-save.
 *
 * **Panel open paths:** double-click OR Enter on a selected node set
 * `sidePanelOpen = true`. Plan 03's <SidePanel> subscribes.
 *
 * **`+` button:** visible when selected (NODE-05). Click is a documented
 * no-op in Phase 2 — Phase 3's RAD-01 wires the radial add menu here.
 */
export default function PersonNode({ personId }: Props) {
  // Narrow per-person selectors (D-10) — mutations to other people don't
  // force this node to re-render.
  const person = useTreeStore((s) => s.people[personId]);
  const selected = useTreeStore((s) => s.selectedPersonId === personId);
  const dragging = useTreeStore((s) => s.draggingPersonId === personId);
  const setSelectedPersonId = useTreeStore((s) => s.setSelectedPersonId);
  const setSidePanelOpen = useTreeStore((s) => s.setSidePanelOpen);
  const dragCtx = useContext(DragStateContext);

  // Race-safe: an optimistic remove followed by an in-flight render can
  // mount with no backing person. The EdgeLayer already filters these,
  // but mirror the guard here so a dangling ID doesn't crash the node.
  if (!person) return null;

  const displayName = person.name || 'Unnamed';

  // Years text per UI-SPEC Copywriting > PersonNode rows.
  let yearsText: string;
  if (person.birthYear == null && person.deathYear == null) {
    yearsText = '\u2014'; // single em dash
  } else if (person.birthYear != null && person.deathYear == null) {
    yearsText = `${person.birthYear} \u2013 `; // en dash + trailing space
  } else if (person.birthYear != null && person.deathYear != null) {
    yearsText = `${person.birthYear} \u2013 ${person.deathYear}`;
  } else {
    yearsText = ` \u2013 ${person.deathYear}`; // leading space, death-only edge case
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Don't fall through to the canvas pan surface underneath.
    e.stopPropagation();
    setSelectedPersonId(personId);
    if (dragCtx) {
      dragCtx.dragStateRef.current = {
        id: personId,
        startX: e.clientX,
        startY: e.clientY,
        origX: person.x,
        origY: person.y,
      };
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPersonId(personId);
    setSidePanelOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selected) {
      e.preventDefault();
      setSidePanelOpen(true);
    }
  };

  // `+` button click — Phase 2 no-op placeholder. Phase 3 RAD-01 wires the
  // radial add menu. Console flag logs the intent so manual testing can
  // verify the button is reachable without silently doing nothing.
  const onPlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // eslint-disable-next-line no-console
    console.info('[Phase 3] radial open for', personId);
  };

  const stripeColor = `var(--gender-${person.gender ?? 'u'})`;

  // Shadow: dragging wins over selected wins over hover. Hover is applied
  // via a tailwind class only when NOT selected and NOT dragging so the
  // heavier selection/drag shadows aren't masked.
  const shadowStyle = dragging
    ? '6px 6px 0 var(--ink)'
    : selected
      ? '0 0 0 2px var(--accent), 4px 4px 0 var(--accent)'
      : undefined;

  return (
    <div
      data-node
      role="button"
      aria-pressed={selected}
      aria-label={`Open person details for ${displayName}`}
      tabIndex={0}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className={cn(
        'absolute flex items-center bg-bg-card select-none',
        'w-[180px] h-[76px]',
        !selected && !person.isMe && 'border border-ink',
        selected && 'border-2 border-accent',
        person.isMe && !selected && 'border-2 border-ink',
        dragging ? 'cursor-grabbing z-[100]' : 'cursor-grab',
        !selected && !dragging && 'hover:shadow-[4px_4px_0_var(--ink)]',
      )}
      style={{
        left: person.x,
        top: person.y,
        boxShadow: shadowStyle,
        transition: 'box-shadow 0.15s ease',
      }}
    >
      {/* Gender accent stripe — 4px left edge */}
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 h-full"
        style={{
          width: 4,
          background: stripeColor,
        }}
      />

      {/* Body: avatar + text column. Left padding accounts for the 4px
          stripe so the avatar lands at 12px + 4px = 16px from the outer
          border. */}
      <div
        className="flex items-center gap-sm h-full w-full"
        style={{ paddingLeft: 16, paddingRight: 12 }}
      >
        <AvatarCircle personId={person.id} name={person.name} />
        <div className="flex flex-col min-w-0">
          <div className="text-[13px] font-semibold leading-[1.2] tracking-[-0.01em] text-ink truncate">
            {displayName}
          </div>
          <div className="font-mono text-[11px] text-ink-2">{yearsText}</div>
        </div>
      </div>

      {/* + button: visible only when selected (NODE-05). Phase 2 no-op;
          Phase 3 RAD-01 wires the radial menu. */}
      {selected && (
        <button
          type="button"
          aria-label={`Add relative to ${displayName}`}
          onClick={onPlusClick}
          onMouseDown={(e) => {
            // Don't start a drag from the + button's mousedown — the drag
            // seeding in the outer node's handler would misinterpret the
            // click as a node drag.
            e.stopPropagation();
          }}
          className="absolute grid place-items-center text-[oklch(1_0_0)]"
          style={{
            bottom: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 28,
            height: 28,
            background: 'var(--accent)',
            border: '1px solid var(--accent)',
            boxShadow: '2px 2px 0 var(--ink)',
            zIndex: 3,
          }}
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      )}

      {/* YOU ribbon for is_me. Mono 9px caps on ink/bg-card, top-right. */}
      {person.isMe && (
        <span
          aria-label="This is you"
          className="absolute font-mono text-[9px] tracking-[0.12em] text-bg-card"
          style={{
            top: -1,
            right: -1,
            background: 'var(--ink)',
            padding: '2px 6px',
            zIndex: 2,
          }}
        >
          YOU
        </span>
      )}
    </div>
  );
}
