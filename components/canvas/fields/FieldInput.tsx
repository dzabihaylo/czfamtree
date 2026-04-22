'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

// Field-local debounce — mirrors useSaveQueue's 400ms. Declared inline so
// each field component is self-contained and can be copy-paste audited
// against UI-SPEC §7 rule 3 without import chasing.
const DEBOUNCE_MS = 400;

type Variant = 'text' | 'mono' | 'year';

type Props = {
  /** UPPERCASE mono label — e.g. "FULL NAME", "PRONOUNS", "LOCATION". */
  label: string;
  /** Authoritative value from the store. Component mirrors it locally. */
  value: string;
  /** Fired 400ms after the last keystroke OR immediately on blur. */
  onCommit: (v: string) => void;
  placeholder?: string;
  /**
   * `year` uses JetBrains Mono, inputMode="numeric", and a 4-digit max.
   * `mono` just uses the mono font (reserved for IDs etc). Default `text`.
   */
  variant?: Variant;
};

/**
 * Local-mirror text input with 400ms debounced commit.
 *
 * **Pattern:** the component owns `local` state mirroring `value`; keystrokes
 * update `local` immediately (no re-render through the Zustand store per key)
 * and reset a 400ms timer. When the timer fires OR the user blurs, `onCommit`
 * runs once with the final value.
 *
 * **Realtime re-sync:** if the parent's `value` prop changes while NO debounce
 * is pending (e.g. a Phase 5 Realtime push arrives for a field the user is
 * not currently editing), local state re-syncs. During active debounce the
 * re-sync is skipped to avoid clobbering in-progress typing.
 *
 * **onBlur flush:** `SidePanel` close handler calls `queue.flush(personId)`
 * to flush anything pending inside `useSaveQueue`, but the field's own
 * debounce is orthogonal — onBlur here flushes the local→commit step first
 * so the pending patch is seeded in the queue before close fires `flush`.
 */
export default function FieldInput({
  label,
  value,
  onCommit,
  placeholder,
  variant = 'text',
}: Props) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Re-sync only when no debounce is in-flight; otherwise active typing
    // would be clobbered by a stale parent value.
    if (!timerRef.current) setLocal(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onCommit(v);
    }, DEBOUNCE_MS);
  };

  const handleBlur = () => {
    // Fire pending debounce immediately on blur so tab-through doesn't
    // leave 400ms of pending writes stranded.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onCommit(local);
    }
  };

  return (
    <div className="block">
      <label className="block font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3 mb-[6px]">
        {label}
      </label>
      <input
        className={cn(
          'w-full border border-rule bg-bg-card text-[14px] text-ink',
          'focus:border-accent focus:outline-none',
          (variant === 'mono' || variant === 'year') && 'font-mono',
        )}
        inputMode={variant === 'year' ? 'numeric' : 'text'}
        pattern={variant === 'year' ? '[0-9]{0,4}' : undefined}
        maxLength={variant === 'year' ? 4 : undefined}
        style={{ padding: '8px 10px' }}
        value={local}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
}
