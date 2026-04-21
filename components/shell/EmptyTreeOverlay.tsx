/**
 * First-run greeting overlay shown when the tree contains only the seed
 * person (peopleList.length <= 1). Matches handoff app.jsx L440-448 Swiss
 * card + UI-SPEC §Copywriting > First-run seeded tree.
 *
 * Accessibility:
 *  - outer `pointer-events-none` so the overlay never blocks canvas drag/click
 *  - inner card `pointer-events-auto` so the card itself can receive clicks
 *    when an action gets wired here in a later phase
 */
export default function EmptyTreeOverlay() {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
      <div
        className="bg-bg-card border border-ink text-center pointer-events-auto max-w-[360px]"
        style={{
          padding: '24px 32px',
          boxShadow: '4px 4px 0 var(--ink)',
        }}
      >
        <div className="mb-sm font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          Getting started
        </div>
        <div className="mb-sm text-[15px] font-semibold">Your tree is ready.</div>
        <div className="text-[13px] text-ink-2">
          Click your card to start adding relatives &mdash; or stay here and get your bearings.
        </div>
      </div>
    </div>
  );
}
