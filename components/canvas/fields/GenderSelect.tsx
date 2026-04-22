'use client';

import { cn } from '@/lib/utils/cn';

type Gender = 'm' | 'f' | 'x' | 'u';

type Props = {
  /** Store value — 'u' (unknown) renders with no button highlighted. */
  value: Gender;
  /** Fires immediately on click; no debounce (discrete enum, 4 possible values). */
  onCommit: (g: Gender) => void;
};

// Ordered per UI-SPEC §Copywriting — Male / Female / Other. Unknown ('u')
// is the default pre-selection state, represented by no button highlighted.
const OPTIONS: { value: Exclude<Gender, 'u'>; label: string }[] = [
  { value: 'm', label: 'Male' },
  { value: 'f', label: 'Female' },
  { value: 'x', label: 'Other' },
];

/**
 * 3-button segmented control for gender. Unlike text/year/textarea fields,
 * commits IMMEDIATELY on click — there's no keystroke stream to debounce.
 *
 * **A11y:** `role="radiogroup"` on the outer div and `role="radio"` +
 * `aria-checked` on each button so a screen reader announces the control
 * as a 3-choice radio group. Tab order is the default button order (left
 * → right).
 */
export default function GenderSelect({ value, onCommit }: Props) {
  return (
    <div className="block">
      <label className="block font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3 mb-[6px]">
        Gender
      </label>
      <div role="radiogroup" aria-label="Gender" className="flex gap-[6px]">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onCommit(opt.value)}
              className={cn(
                'text-[13px] font-semibold border',
                selected
                  ? 'bg-ink text-bg-card border-ink'
                  : 'bg-bg-card text-ink border-rule hover:border-ink',
              )}
              style={{ padding: '6px 12px' }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
