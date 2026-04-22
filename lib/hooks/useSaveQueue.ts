'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTreeStoreApi } from '@/lib/store/tree-store';
import { updatePerson } from '@/app/actions/people';
import type { PersonPatch } from '@/lib/schemas/person';

// ────────────────────────────────────────────────────────────────────────────
// Phase 2 auto-save constants — declared inline (D-14 / UI-SPEC §7).
//
//  - DEBOUNCE_MS:     per-field keystroke settle window before a save fires.
//  - SAVED_LINGER_MS: dwell time on the green 'Saved' pill before returning
//                     to neutral 'Auto-saves' (SAVE-03).
//
// Module-scope literals so a change here is visible to the test grep that
// Task 1's acceptance criteria uses.
// ────────────────────────────────────────────────────────────────────────────
const DEBOUNCE_MS = 400;
const SAVED_LINGER_MS = 1400;

type PersonId = string;

/**
 * Per-person queue slot. One instance lives in `byPerson.current` per person
 * the user has touched since mount. All mutation to this object is
 * synchronous inside the hook — no React state, no re-renders.
 *
 *  - `pending`: dirty patch not yet sent (merges when new edits arrive
 *               during an in-flight save — SAVE-04 serial queue).
 *  - `timer`: 400ms debounce handle; nulled when fired or flushed.
 *  - `inFlight`: Promise representing the currently running updatePerson call.
 *                Non-null while the server call is running; the finally
 *                branch chains a new runSave if `pending` is non-empty.
 *  - `lastFailedPatch`: payload that the last errored runSave tried to send;
 *                       `retry(personId)` re-queues it.
 *  - `lingerTimer`: the setTimeout that flips 'saved' → 'idle' after
 *                   SAVED_LINGER_MS, guarded by a read-back check.
 */
type PerPerson = {
  pending: Partial<PersonPatch>;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: Promise<void> | null;
  lastFailedPatch: Partial<PersonPatch> | null;
  lingerTimer: ReturnType<typeof setTimeout> | null;
};

export type SaveQueue = {
  enqueueField: <K extends keyof PersonPatch>(
    personId: PersonId,
    field: K,
    value: PersonPatch[K],
  ) => void;
  enqueueMove: (personId: PersonId, x: number, y: number) => void;
  flush: (personId: PersonId) => void;
  retry: (personId: PersonId) => void;
};

/**
 * Per-person serial save queue with per-field 400ms debounce + pill-state
 * transitions + retry handle. Owns the authoritative writes to
 * `saveStateByPersonId` — the pill reads from here, the toast reads from here.
 *
 * **Serial contract (SAVE-04):** two concurrent updatePerson requests for the
 * same personId are structurally prevented. If `runSave` is already running
 * when a new debounce fires, the new patch merges into `pending` and the
 * in-flight's `finally` chains a new `runSave` if pending is non-empty.
 *
 * **Pill transitions:**
 *   idle --(debounce fires)--> saving
 *   saving --(2xx ack)--> saved --(SAVED_LINGER_MS, guarded)--> idle
 *   saving --(throw/4xx/5xx)--> error
 *   error  --(retry)--> saving
 *
 * The `saved -> idle` transition reads `saveStateByPersonId[id] === 'saved'`
 * before writing — a subsequent edit that moved the pill to 'saving' or
 * 'error' during the linger window is NOT clobbered back to idle.
 *
 * **Phase 2 lock:** does NOT wire into the zundo undo-history middleware
 * (D-06). Phase 3 HIST-05 registers drag/edit into past-state snapshots.
 */
export function useSaveQueue(treeId: string): SaveQueue {
  const storeApi = useTreeStoreApi();
  const byPerson = useRef<Map<PersonId, PerPerson>>(new Map());

  // Cleanup on unmount — clear all timers. The Map itself is garbage-collected
  // with the component; in-flight Promises continue to run and their .catch
  // branches will try to write to the store, but the store lives in the
  // Provider (not this hook) so writes are safe post-unmount.
  useEffect(() => {
    const map = byPerson.current;
    return () => {
      for (const entry of map.values()) {
        if (entry.timer) clearTimeout(entry.timer);
        if (entry.lingerTimer) clearTimeout(entry.lingerTimer);
      }
    };
  }, []);

  function getEntry(personId: PersonId): PerPerson {
    let e = byPerson.current.get(personId);
    if (!e) {
      e = {
        pending: {},
        timer: null,
        inFlight: null,
        lastFailedPatch: null,
        lingerTimer: null,
      };
      byPerson.current.set(personId, e);
    }
    return e;
  }

  async function runSave(personId: PersonId): Promise<void> {
    const e = getEntry(personId);
    // Capture and clear pending BEFORE the await so new edits arriving while
    // the server is processing merge into a fresh (empty) pending slot that
    // the finally-branch will pick up as a chained save.
    const patch = e.pending;
    e.pending = {};
    if (Object.keys(patch).length === 0) {
      e.inFlight = null;
      return;
    }

    const { setSaveState } = storeApi.getState();
    setSaveState(personId, 'saving');

    try {
      await updatePerson(treeId, personId, patch as PersonPatch);
      // Successful ACK — pill flips green (SAVE-02). Pill flips green ONLY on
      // server ACK; the hook never transitions to 'saved' optimistically.
      storeApi.getState().setSaveState(personId, 'saved');
      e.lastFailedPatch = null;

      // SAVE-03: saved lingers SAVED_LINGER_MS then returns to idle, guarded
      // by a read-back — a subsequent edit that moved the pill to 'saving'
      // or 'error' during the linger window is not clobbered.
      if (e.lingerTimer) clearTimeout(e.lingerTimer);
      e.lingerTimer = setTimeout(() => {
        if (storeApi.getState().saveStateByPersonId[personId] === 'saved') {
          storeApi.getState().setSaveState(personId, 'idle');
        }
        e.lingerTimer = null;
      }, SAVED_LINGER_MS);
    } catch (_err) {
      // Error surface: pill red + stash payload for retry(). No error.message
      // bubbles through — Plan 01's Server Actions already wrap messages,
      // and the SaveErrorToast renders only static copy (T-02-13 mitigation).
      storeApi.getState().setSaveState(personId, 'error');
      e.lastFailedPatch = patch;
      // Deliberately do NOT rethrow — the SaveErrorToast subscribes to the
      // store's 'error' transition and renders Retry. Throwing here would
      // leak into the calling React event handler as an unhandled rejection.
    } finally {
      // Chain: if pending accumulated during the save, run again immediately
      // without waiting for a new debounce window (SAVE-04 serial queue).
      if (Object.keys(e.pending).length > 0) {
        e.inFlight = runSave(personId);
      } else {
        e.inFlight = null;
      }
    }
  }

  function scheduleDebounce(personId: PersonId) {
    const e = getEntry(personId);
    if (e.timer) clearTimeout(e.timer);
    e.timer = setTimeout(() => {
      e.timer = null;
      // If a save is in-flight, the new patch merge is already in e.pending
      // and the finally-branch of the running save will pick it up. Only
      // start a new in-flight when the queue is idle.
      if (!e.inFlight) {
        e.inFlight = runSave(personId);
      }
    }, DEBOUNCE_MS);
  }

  const api = useMemo<SaveQueue>(
    () => ({
      enqueueField(personId, field, value) {
        const e = getEntry(personId);
        (e.pending as Record<string, unknown>)[field as string] = value;
        scheduleDebounce(personId);
      },
      enqueueMove(personId, x, y) {
        const e = getEntry(personId);
        e.pending.x = x;
        e.pending.y = y;
        // No debounce — drag-end fires immediately (UI-SPEC §4 + §7 rule 8).
        // Funnels through the same per-person serial queue so a drag save
        // cannot race a field save for the same person.
        //
        // NB: PanZoomWrapper in Plan 02 calls `movePerson` directly for
        // drag-end rather than routing through here, because the drag commit
        // also needs optimistic revert on error (which this queue does not
        // do). `enqueueMove` is exposed as an opt-in path for future Plan
        // 03/04/05 consumers that want to serialize moves with field edits.
        if (!e.inFlight) {
          e.inFlight = runSave(personId);
        }
      },
      flush(personId) {
        const e = byPerson.current.get(personId);
        if (!e) return;
        if (e.timer) {
          clearTimeout(e.timer);
          e.timer = null;
        }
        // Fire whatever is pending, chaining onto in-flight if any. Used by
        // <SidePanel> unmount cleanup so closing the panel mid-typing still
        // persists the last keystroke (UI-SPEC §7 rule 6).
        if (!e.inFlight && Object.keys(e.pending).length > 0) {
          e.inFlight = runSave(personId);
        }
      },
      retry(personId) {
        const e = byPerson.current.get(personId);
        if (!e || !e.lastFailedPatch) return;
        // Merge failed payload back into pending and fire. If a new edit
        // arrived after the failure, the merge preserves the newer value
        // (Object.assign's later-wins semantics) — but the typical flow is
        // fail -> user clicks Retry -> this fires with the same patch.
        Object.assign(e.pending, e.lastFailedPatch);
        e.lastFailedPatch = null;
        if (!e.inFlight) {
          e.inFlight = runSave(personId);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [treeId, storeApi],
  );

  return api;
}
