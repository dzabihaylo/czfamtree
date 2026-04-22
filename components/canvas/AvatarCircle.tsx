'use client';

import { cn } from '@/lib/utils/cn';
import { hashUserIdToColor, initialsFromName } from '@/lib/utils/hashUserId';

type Props = {
  personId: string;
  name: string;
  className?: string;
};

/**
 * 40px variant of the Phase 1 `<Avatar>` (which is 28/32px). Styling mirrors
 * that component's Swiss-rule `rounded-full` exception — avatars are the
 * only authorised consumers of non-zero border radius on the canvas
 * surface.
 *
 * Color is derived from `personId`, NOT from gender. Gender is surfaced by
 * the PersonNode's left-edge 4px stripe (UI-SPEC §Color). Using personId
 * keeps the color stable per person across renders even when gender is
 * unset or changes.
 *
 * A11y: avatar is decorative — `aria-hidden="true"`. The parent PersonNode
 * carries the `aria-label="Open person details for {name}"` that surfaces
 * the semantic identity to screen readers.
 */
export default function AvatarCircle({ personId, name, className }: Props) {
  const bg = hashUserIdToColor(personId);
  const initials = initialsFromName(name || '');
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid place-items-center rounded-full text-[oklch(1_0_0)] font-mono font-semibold select-none',
        'h-[40px] w-[40px] text-[13px]',
        className,
      )}
      style={{ background: bg }}
    >
      {initials}
    </div>
  );
}
