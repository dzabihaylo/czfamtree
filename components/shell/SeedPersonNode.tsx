export type SeedPersonNodeProps = {
  name: string;
  x: number;
  y: number;
};

/**
 * Static render of the seeded "You" person at (0,0). Phase 1 only — no drag,
 * no selection, no radial menu, no avatar (Phase 2 adds all of those).
 *
 * Matches handoff components.jsx L5-72 `PersonNode` stripped to the
 * `.node.is-me` variant: 168px wide, 2px ink border, "YOU" ribbon pinned
 * top-right (handoff .node.is-me::before). Border radius defaults to 0 from
 * the Tailwind v4 @theme so no explicit rounded-* class is required.
 */
export default function SeedPersonNode({ name, x, y }: SeedPersonNodeProps) {
  return (
    <div
      className="absolute flex w-[168px] flex-col border-[2px] border-ink bg-bg-card select-none"
      style={{ left: x, top: y }}
      aria-label={`Seed person: ${name}`}
    >
      {/* YOU ribbon — handoff .node.is-me::before */}
      <span
        className="absolute -top-[1px] -right-[1px] z-[2] bg-ink font-mono text-[9px] tracking-[0.12em] text-bg-card"
        style={{ padding: '2px 6px' }}
      >
        YOU
      </span>

      {/* Node body — handoff .node-body padding 10px 12px 12px */}
      <div className="px-md pt-[10px] pb-md">
        <div className="text-[14px] font-semibold leading-[1.2] tracking-[-0.01em] text-ink mb-[4px]">
          {name}
        </div>
        {/* Years slot: empty for the Phase 1 seed (no birth_year recorded yet) */}
        <div className="font-mono text-[11px] text-ink-2">&nbsp;</div>
      </div>
    </div>
  );
}
