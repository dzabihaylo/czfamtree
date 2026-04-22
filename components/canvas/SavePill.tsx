'use client';

import { useTreeStore, type SaveState } from '@/lib/store/tree-store';

type Props = {
  personId: string;
  /** Delegated to `useSaveQueue.retry(personId)` by the parent. */
  onRetry: () => void;
};

type Style = {
  dot: string;
  text: string;
  border: string;
  bg: string;
  label: string;
};

/**
 * Resolve a pill style bundle for each save state.
 *
 *  - `idle`   — neutral "Auto-saves" reassurance. Default.
 *  - `saving` — ink-3 dot + text; no spinner (D-15: no pulse/animation).
 *  - `saved`  — green dot + soft green fill; visible for SAVED_LINGER_MS
 *               (managed by useSaveQueue, not this component).
 *  - `error`  — danger dot + soft red fill; renders as a <button> so users
 *               can click it to retry (keyboard-reachable).
 *
 * Note: Phase 2 intentionally has NO 'dirty' visible state — the pill jumps
 * straight from 'idle' to 'saving' when the debounce fires (UI-SPEC §7).
 */
function styleFor(state: SaveState): Style {
  switch (state) {
    case 'saving':
      return {
        dot: 'var(--ink-3)',
        text: 'var(--ink-3)',
        border: 'var(--rule)',
        bg: 'var(--bg-soft)',
        label: 'Saving\u2026',
      };
    case 'saved':
      return {
        dot: 'var(--success)',
        text: 'var(--success)',
        border: 'var(--success)',
        bg: 'var(--save-saved-bg)',
        label: 'Saved',
      };
    case 'error':
      return {
        dot: 'var(--danger)',
        text: 'var(--danger)',
        border: 'var(--danger)',
        bg: 'var(--save-error-bg)',
        label: 'Couldn\u2019t save',
      };
    case 'idle':
    default:
      return {
        dot: 'var(--ink-3)',
        text: 'var(--ink-3)',
        border: 'var(--rule)',
        bg: 'var(--bg-soft)',
        label: 'Auto-saves',
      };
  }
}

/**
 * 5-state save pill rendered inside `<SidePanel>` header next to
 * "Person · {id6}". Subscribes to `saveStateByPersonId[personId]` — the
 * authoritative writer is `useSaveQueue` (Task 1) + `PanZoomWrapper`
 * (drag-save, Plan 02).
 *
 * **A11y:**
 *   - Non-error states render as `<span role="status" aria-live="polite">`
 *     so screen readers announce transitions without focus hijack.
 *   - Error state renders as `<button>` so it's keyboard-reachable and
 *     clickable; `aria-label` explains the retry action.
 *
 * **D-15 (no pulse):** the dot is a static colored disc — no CSS
 * keyframes, no transform pulsing. The state text itself carries the
 * information, not motion.
 */
export default function SavePill({ personId, onRetry }: Props) {
  const state = useTreeStore((s) => s.saveStateByPersonId[personId] ?? 'idle');
  const s = styleFor(state);

  const content = (
    <>
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: s.dot,
          display: 'inline-block',
        }}
      />
      <span>{s.label}</span>
    </>
  );

  if (state === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Retry saving \u2014 last save failed"
        className="inline-flex items-center gap-[4px] font-mono text-[11px] tracking-[0.08em] cursor-pointer"
        style={{
          padding: '2px 6px',
          background: s.bg,
          border: `1px solid ${s.border}`,
          color: s.text,
          transition: 'all 0.2s ease',
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="inline-flex items-center gap-[4px] font-mono text-[11px] tracking-[0.08em]"
      style={{
        padding: '2px 6px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        transition: 'all 0.2s ease',
      }}
    >
      {content}
    </span>
  );
}
