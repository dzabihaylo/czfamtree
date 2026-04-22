'use client';

import { useMemo } from 'react';
import { useTreeStore, type Person } from '@/lib/store/tree-store';

type Props = {
  person: Person;
  /** Clicking a name selects that person AND recenters the canvas (PANEL-06). */
  onPersonClick: (id: string) => void;
};

/**
 * Read-only Parents / Spouses / Children list rendered inside `<SidePanel>`.
 *
 * - Parents and Spouses are sourced from the selected person's id arrays.
 * - Children are derived by scanning `Object.values(peopleRecord)` for
 *   anyone whose `parentIds` includes this person. Handoff model also
 *   mirrors `childIds`, but we recompute here so the list stays correct
 *   even when a future edit forgets to patch both sides.
 * - Missing counterparts (id in parentIds but the person not yet hydrated)
 *   are filtered via `Boolean` — graceful, no throws.
 *
 * Clicking a name fires `onPersonClick(id)`; `<SidePanel>` turns that into
 * `setSelectedPersonId(id) + setTransform(...)` so the canvas recenters.
 * Panel stays open (PANEL-06).
 */
export default function RelationsList({ person, onPersonClick }: Props) {
  const peopleRecord = useTreeStore((s) => s.people);

  const parents = useMemo(
    () => person.parentIds.map((id) => peopleRecord[id]).filter(Boolean) as Person[],
    [person.parentIds, peopleRecord],
  );
  const spouses = useMemo(
    () => person.spouseIds.map((id) => peopleRecord[id]).filter(Boolean) as Person[],
    [person.spouseIds, peopleRecord],
  );
  const children = useMemo(
    () => Object.values(peopleRecord).filter((p) => p.parentIds.includes(person.id)),
    [person.id, peopleRecord],
  );

  const row = (label: string, list: Person[]) => (
    <div className="font-mono text-[12px] text-ink-2 leading-[1.6]">
      <span>{label}: </span>
      {list.length === 0
        ? '\u2014' /* em dash for empty */
        : list.map((p, i) => (
            <span key={p.id}>
              <button
                type="button"
                onClick={() => onPersonClick(p.id)}
                className="cursor-pointer hover:text-ink hover:underline"
              >
                {p.name || 'Unnamed'}
              </button>
              {i < list.length - 1 ? ' \u00B7 ' : ''}
            </span>
          ))}
    </div>
  );

  return (
    <div className="block">
      <label className="block font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3 mb-[6px]">
        Relations
      </label>
      <div className="flex flex-col gap-[4px]">
        {row('Parents', parents)}
        {row('Spouses', spouses)}
        {row('Children', children)}
      </div>
    </div>
  );
}
