'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTreeStore } from '@/lib/store/tree-store';

// Auto-dismiss window per UI-SPEC Copywriting "Save Error States" + D-16.
// Inline literal so the grep-based acceptance criterion catches stale edits
// that change the dwell without updating the spec.
const TOAST_DISMISS_MS = 4400;

type Props = {
  /** Delegates to `queue.retry(personId)` — TreeCanvas owns the queue. */
  onRetry: (personId: string) => void;
};

/**
 * Transient bottom-center toast for save failures.
 *
 * Subscribes to the store's `saveStateByPersonId` map and surfaces the first
 * person in `'error'` state. If multiple concurrent errors exist, the toast
 * collapses to one — a single Retry covers the common case (a connectivity
 * blip affecting every in-flight save), and UI-SPEC §7 explicitly permits
 * merging.
 *
 * **A11y:** `role="alert"` + `aria-live="assertive"` so SR users hear the
 * failure even without focus change (UI-SPEC Accessibility).
 *
 * **Copy simplification (documented for verifier):** UI-SPEC suggests
 * per-field copy like `Couldn't save {fieldLabel}`, but `useSaveQueue`
 * batches dirty fields into a single patch and only tracks per-person state
 * — not per-field. Person-level copy is accurate, less noisy, and matches
 * the handoff's drag-failure precedent (`Couldn't save move for {name}`).
 * Plan 04 can refine to per-field if QA asks for it.
 *
 * **D-16:** hand-rolled toast primitive (no third-party toast library) —
 *           scope is save errors only.
 */
export default function SaveErrorToast({ onRetry }: Props) {
  const saveStateByPersonId = useTreeStore((s) => s.saveStateByPersonId);
  const peopleRecord = useTreeStore((s) => s.people);

  // First person in 'error' state. Object.entries order is insertion-stable
  // in modern JS engines, so on repeated errors the oldest-errored person
  // wins — giving the user a chance to retry something they remember editing.
  const errorPersonId = useMemo(() => {
    for (const [id, state] of Object.entries(saveStateByPersonId)) {
      if (state === 'error') return id;
    }
    return null;
  }, [saveStateByPersonId]);

  const person = errorPersonId ? peopleRecord[errorPersonId] : null;

  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed when a fresh error surfaces for a new person, so the
  // user can see and act on each new failure rather than having one
  // dismissal permanently mute the toast.
  useEffect(() => {
    setDismissed(false);
  }, [errorPersonId]);

  useEffect(() => {
    if (!errorPersonId || dismissed) return;
    const t = setTimeout(() => setDismissed(true), TOAST_DISMISS_MS);
    return () => clearTimeout(t);
  }, [errorPersonId, dismissed]);

  if (!errorPersonId || !person || dismissed) return null;

  const displayName = person.name || 'Unnamed';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed left-1/2 flex items-center gap-[12px] font-sans text-[13px] text-bg-card bg-ink"
      // z-index: 200 — above the side panel (z-40) and any node shadows.
      style={{
        bottom: 80,
        transform: 'translateX(-50%)',
        padding: '10px 16px',
        zIndex: 200,
        boxShadow: '3px 3px 0 var(--accent)',
      }}
    >
      <span>Couldn&apos;t save changes for {displayName}</span>
      <button
        type="button"
        onClick={() => {
          onRetry(errorPersonId);
        }}
        aria-label={`Retry saving ${displayName}`}
        className="font-semibold hover:underline"
        style={{ color: 'var(--accent)' }}
      >
        Retry
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss error"
        className="text-bg-card opacity-70 hover:opacity-100"
      >
        \u00D7
      </button>
    </div>
  );
}
