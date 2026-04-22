'use client';

import { useEffect, useRef, useState } from 'react';

// Mirror FieldInput's debounce — 400ms from last keystroke. Inline so a
// future change to one field's debounce doesn't silently desync the other.
const DEBOUNCE_MS = 400;

type Props = {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
};

/**
 * 4-row textarea with the same local-mirror + 400ms debounced commit
 * pattern as `FieldInput`. Used for the Notes field in `<SidePanel>`.
 *
 * `resize: 'vertical'` lets the user grow the box for longer stories
 * without the whole panel reflowing horizontally (handoff behaviour).
 */
export default function FieldTextarea({ label, value, onCommit, placeholder }: Props) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!timerRef.current) setLocal(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setLocal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onCommit(v);
    }, DEBOUNCE_MS);
  };

  const handleBlur = () => {
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
      <textarea
        className="w-full border border-rule bg-bg-card text-[14px] text-ink focus:border-accent focus:outline-none font-sans"
        rows={4}
        style={{ padding: '8px 10px', resize: 'vertical' }}
        value={local}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
}
