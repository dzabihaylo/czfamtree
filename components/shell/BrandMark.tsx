export type BrandMarkProps = { size?: 'sm' | 'lg'; className?: string };

/**
 * CZ brand mark — ink square glyph.
 *
 * size='sm' = 20×20px (topbar, handoff styles.css L296-304 .topbar-brand-mark)
 * size='lg' = 28×28px (sign-in screen, handoff styles.css L639-647 .login-brand-mark)
 *
 * aria-hidden because the wordmark adjacent to the glyph carries the brand name
 * for screen readers.
 */
export default function BrandMark({ size = 'sm', className = '' }: BrandMarkProps) {
  const dim = size === 'sm' ? 20 : 28;
  const fontSize = size === 'sm' ? 11 : 13;
  return (
    <span
      className={`grid place-items-center bg-ink text-bg-card font-mono ${className}`}
      style={{
        height: dim,
        width: dim,
        fontSize,
      }}
      aria-hidden="true"
    >
      CZ
    </span>
  );
}
