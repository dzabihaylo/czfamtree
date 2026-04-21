import { cn } from '@/lib/utils/cn';

export type AvatarProps = {
  initials: string;
  size?: 28 | 32;
  bgColor?: string;
  className?: string;
  title?: string;
};

/**
 * Circular avatar — the ONLY Swiss-rule exception to 0px radii everywhere
 * (UI-SPEC §Spacing: "Border radius: 0px everywhere. Exceptions: Avatars
 * (circles)"). Uses `rounded-full` as the single authorised occurrence.
 *
 * size=32: topbar trigger (default)
 * size=28: presence stack (Phase 5 — pre-styled here for consistency)
 */
export default function Avatar({
  initials,
  size = 32,
  bgColor = 'oklch(0.62 0.006 80)', // default --ink-3
  className,
  title,
}: AvatarProps) {
  return (
    <div
      title={title}
      className={cn(
        'grid place-items-center rounded-full text-[oklch(1_0_0)] font-mono font-semibold select-none',
        size === 32 ? 'h-[32px] w-[32px] text-[11px]' : 'h-[28px] w-[28px] text-[10px]',
        className,
      )}
      style={{ background: bgColor }}
      aria-label={title ?? `Avatar for ${initials}`}
    >
      {initials}
    </div>
  );
}
