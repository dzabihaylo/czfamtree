/**
 * Canvas grid background — applies the `.grid-bg` utility defined in
 * `app/globals.css` (24px dot grid from handoff styles.css L59-64).
 *
 * `pointer-events-none` so clicks fall through to nodes above.
 * `absolute inset-0` to fill the parent canvas container.
 */
export default function GridBackground({ className = '' }: { className?: string }) {
  return (
    <div
      className={`grid-bg absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
