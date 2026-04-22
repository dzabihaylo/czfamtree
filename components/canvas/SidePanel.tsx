'use client';

import { useCallback, useEffect } from 'react';
import { Check, Trash2, User, X } from 'lucide-react';
import {
  useTreeStore,
  useTreeStoreApi,
  type Person,
} from '@/lib/store/tree-store';
import type { PersonPatch } from '@/lib/schemas/person';
import { useSaveQueue } from '@/lib/hooks/useSaveQueue';
import { removePerson } from '@/app/actions/people';
import FieldInput from './fields/FieldInput';
import FieldTextarea from './fields/FieldTextarea';
import GenderSelect from './fields/GenderSelect';
import RelationsList from './RelationsList';
import SavePill from './SavePill';

// ────────────────────────────────────────────────────────────────────────────
// Phase 2 layout constants — declared inline per UI-SPEC (REQ PANEL-02).
//
//  - PANEL_WIDTH:   380px (locked)
//  - TOPBAR_HEIGHT: 52px (matches PanZoomWrapper's `top: 52`)
//
// The center-on-person math (NODE_W/2 = 90, NODE_H/2 = 38) mirrors Plan 01's
// NODE_W = 180, NODE_H = 76 in `lib/graph/edges.ts`; re-declaring here keeps
// the centering arithmetic auditable without cross-file indirection.
// ────────────────────────────────────────────────────────────────────────────
const PANEL_WIDTH = 380;
const TOPBAR_HEIGHT = 52;
const NODE_HALF_W = 90;
const NODE_HALF_H = 38;

type Props = {
  tree: { id: string };
};

/**
 * 380px right-docked side panel — the editing surface for the selected
 * person.
 *
 * Layout (UI-SPEC §6):
 *
 *   ┌───────────────── header (padding 20px 24px 16px) ──────────────────┐
 *   │  PERSON \u00B7 A1B2C3   [ pill ]                                  X │
 *   │  Full name heading (18px semibold)                                  │
 *   ├─────────────────── content (overflow-y auto) ──────────────────────┤
 *   │  Full name input                                                    │
 *   │  Gender segmented                                                   │
 *   │  Pronouns input                                                     │
 *   │  Born / Died (2-col grid) | Location | Notes textarea               │
 *   │  Relations (read-only clickable)                                    │
 *   │  Actions: Center on this person | Remove (hidden when is_me)        │
 *   ├───────────────────── footer (padding 12px 24px) ────────────────────┤
 *   │  "Changes save automatically"            [ Done ]                   │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * **Contract with `useSaveQueue`:**
 *   - Each field's `onCommit` calls `commit(field, value)` which:
 *      (a) optimistically patches the local store so PersonNode +
 *          EdgeLayer re-render with the new value immediately;
 *      (b) enqueues the field into the per-person debounce window.
 *   - Panel close (X button, Done, or unmount) calls `queue.flush(personId)`
 *     so any pending debounce fires its save NOW (UI-SPEC §7 rule 6).
 *
 * **Remove (D-07 + PANEL-08):**
 *   - Button hidden when `person.isMe === true`.
 *   - `window.confirm(...)` gates the delete — OS-level modal, cannot be
 *     suppressed by page JS (T-02-14 acceptance).
 *   - On success: removePersonFromStore + close panel + clear selection.
 *   - On failure: pill flips 'error' and the SaveErrorToast surfaces.
 *
 * **Center on person (PANEL-06 + PANEL-07):**
 *   - Relation-list click AND "Center on this person" action use the same
 *     math: translate the canvas so the target person's midpoint is at
 *     the screen midpoint, with the 380px panel subtracted from the
 *     viewport width.
 *   - Reset zoom to `k: 1` so previously zoomed-out users see the target
 *     at full size (UI-SPEC Motion — instant in Phase 2, 300ms ease-out
 *     animation deferred to Phase 3 when per-transform tweens land).
 */
export default function SidePanel({ tree }: Props) {
  const personId = useTreeStore((s) => s.selectedPersonId);
  const open = useTreeStore((s) => s.sidePanelOpen);
  // `person` has to be a narrow per-person subscription so typing in the
  // name field doesn't re-render every other panel consumer — BUT the
  // panel itself needs the whole record to render fields. Fine: one
  // re-render per keystroke is exactly what optimistic-local expects.
  const person = useTreeStore((s) => (personId ? s.people[personId] : null));
  const setSidePanelOpen = useTreeStore((s) => s.setSidePanelOpen);
  const setSelectedPersonId = useTreeStore((s) => s.setSelectedPersonId);
  const removePersonFromStore = useTreeStore((s) => s.removePersonFromStore);
  const setTransform = useTreeStore((s) => s.setTransform);
  const setPersonField = useTreeStore((s) => s.setPersonField);

  const storeApi = useTreeStoreApi();
  const queue = useSaveQueue(tree.id);

  // Flush any pending debounce on panel close / person switch. `queue` lives
  // inside this component, so unmount implicitly clears the queue's timers
  // — but `flush` fires the save FIRST so the last keystroke isn't stranded.
  useEffect(() => {
    const id = personId;
    return () => {
      if (id) queue.flush(id);
    };
  }, [personId, queue]);

  const close = useCallback(() => {
    if (personId) queue.flush(personId);
    setSidePanelOpen(false);
  }, [personId, queue, setSidePanelOpen]);

  // `commit` is the single funnel for all field edits — optimistic local
  // patch + enqueue into the per-person debounce. `K extends keyof PersonPatch`
  // keeps the value type aligned with the field name at the call site.
  const commit = useCallback(
    <K extends keyof PersonPatch>(field: K, value: PersonPatch[K]) => {
      if (!personId) return;
      // Optimistic local patch — `field` is a key of PersonPatch which is a
      // structural subset of Person. The cast narrows it to `keyof Person`
      // for setPersonField's generic; at runtime the property access works
      // because every PersonPatch key exists on Person.
      setPersonField(
        personId,
        field as unknown as keyof Person,
        value as Person[keyof Person],
      );
      queue.enqueueField(personId, field, value);
    },
    [personId, queue, setPersonField],
  );

  const handleRelationClick = useCallback(
    (id: string) => {
      setSelectedPersonId(id);
      const p = storeApi.getState().people[id];
      if (p) {
        // Center math: translate so target midpoint is at screen midpoint.
        // Subtract PANEL_WIDTH from the effective viewport width because the
        // panel occupies the right 380px. `+ TOPBAR_HEIGHT` on Y because
        // the canvas <section> already starts at `top: 52`.
        const vw = window.innerWidth - PANEL_WIDTH;
        const vh = window.innerHeight - TOPBAR_HEIGHT;
        setTransform({
          x: vw / 2 - (p.x + NODE_HALF_W),
          y: vh / 2 - (p.y + NODE_HALF_H) + TOPBAR_HEIGHT,
          k: 1,
        });
      }
    },
    [setSelectedPersonId, storeApi, setTransform],
  );

  const handleRemove = useCallback(async () => {
    if (!personId || !person || person.isMe) return;
    const displayName = person.name || 'this person';
    if (
      !window.confirm(
        `Remove ${displayName} from the tree? This can\u2019t be undone.`,
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
      // Surface as pill red on the current person. SaveErrorToast (Task 4)
      // subscribes to the error state and renders a Retry-capable toast.
      storeApi.getState().setSaveState(personId, 'error');
    }
  }, [
    personId,
    person,
    tree.id,
    removePersonFromStore,
    setSidePanelOpen,
    setSelectedPersonId,
    storeApi,
  ]);

  // Guard: no selected person or panel closed → render nothing. Placed AFTER
  // the hooks so hook-order invariant is preserved across open/close cycles.
  if (!open || !personId || !person) return null;

  const displayName = person.name || 'Unnamed';

  return (
    <aside
      role="complementary"
      aria-label="Person details"
      data-sidepanel
      className="absolute right-0 bottom-0 bg-bg-card flex flex-col z-[40]"
      // Inline style writes literal width: 380 and top: 52 via the constants
      // declared at module scope (PANEL_WIDTH = 380, TOPBAR_HEIGHT = 52).
      style={{
        top: TOPBAR_HEIGHT /* top: 52 */,
        width: PANEL_WIDTH /* width: 380 */,
        borderLeft: '1px solid var(--rule)',
        transform: 'translateX(0)',
        transition: 'transform 0.2s ease',
      }}
    >
      {/* Header */}
      <header
        className="flex items-start justify-between"
        style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--rule)' }}
      >
        <div>
          <div className="flex items-center gap-sm">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
              Person \u00B7 {person.id.slice(0, 6)}
            </span>
            <SavePill
              personId={person.id}
              onRetry={() => queue.retry(person.id)}
            />
          </div>
          <div
            className="text-[18px] font-semibold mt-[4px] text-ink"
            style={{ letterSpacing: '-0.015em' }}
          >
            {displayName}
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close person details"
          className="p-1 text-ink-2 hover:text-ink"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px' }}>
        {/* Identity */}
        <section style={{ marginBottom: 24 }}>
          <FieldInput
            label="Full name"
            value={person.name}
            onCommit={(v) => commit('name', v)}
          />
        </section>
        <section
          style={{
            marginBottom: 24,
            paddingTop: 24,
            borderTop: '1px solid var(--rule-soft)',
          }}
        >
          <GenderSelect
            value={person.gender}
            onCommit={(g) => commit('gender', g)}
          />
        </section>
        <section style={{ marginBottom: 24 }}>
          <FieldInput
            label="Pronouns"
            value={person.pronouns ?? ''}
            onCommit={(v) => commit('pronouns', v || null)}
            placeholder="she/her \u00B7 he/him \u00B7 they/them"
          />
        </section>

        {/* Life */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 24,
            paddingTop: 24,
            borderTop: '1px solid var(--rule-soft)',
          }}
        >
          <FieldInput
            label="Born"
            variant="year"
            value={person.birthYear?.toString() ?? ''}
            onCommit={(v) => commit('birthYear', v ? parseInt(v, 10) : null)}
            placeholder="YYYY"
          />
          <FieldInput
            label="Died"
            variant="year"
            value={person.deathYear?.toString() ?? ''}
            onCommit={(v) => commit('deathYear', v ? parseInt(v, 10) : null)}
            placeholder="YYYY"
          />
        </section>
        <section style={{ marginBottom: 24 }}>
          <FieldInput
            label="Location"
            value={person.birthPlace ?? ''}
            onCommit={(v) => commit('birthPlace', v || null)}
            placeholder="e.g. Vancouver, BC"
          />
        </section>
        <section style={{ marginBottom: 24 }}>
          <FieldTextarea
            label="Notes"
            value={person.notes ?? ''}
            onCommit={(v) => commit('notes', v || null)}
            placeholder="Stories, memories, a short bio\u2026"
          />
        </section>

        {/* Relations */}
        <section
          style={{
            marginBottom: 24,
            paddingTop: 24,
            borderTop: '1px solid var(--rule-soft)',
          }}
        >
          <RelationsList
            person={person}
            onPersonClick={handleRelationClick}
          />
        </section>

        {/* Actions */}
        <section
          style={{
            marginBottom: 24,
            paddingTop: 24,
            borderTop: '1px solid var(--rule-soft)',
          }}
        >
          <div className="flex flex-col gap-sm">
            <button
              type="button"
              onClick={() => handleRelationClick(person.id)}
              className="inline-flex items-center gap-[6px] justify-center font-semibold text-[13px] bg-bg-card text-ink border border-rule hover:border-ink"
              style={{ padding: '8px 12px' }}
            >
              <User size={13} aria-hidden="true" /> Center on this person
            </button>
            {!person.isMe && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-[6px] justify-center font-semibold text-[13px] bg-bg-card border border-rule hover:border-danger"
                style={{ padding: '8px 12px', color: 'var(--danger)' }}
              >
                <Trash2 size={13} aria-hidden="true" /> Remove
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        className="flex items-center justify-between"
        style={{ padding: '12px 24px', borderTop: '1px solid var(--rule-soft)' }}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          Changes save automatically
        </span>
        <button
          type="button"
          onClick={close}
          className="inline-flex items-center gap-[6px] font-semibold text-[13px] bg-ink text-bg-card border border-ink"
          style={{ padding: '6px 12px' }}
        >
          <Check size={13} aria-hidden="true" /> Done
        </button>
      </footer>
    </aside>
  );
}
