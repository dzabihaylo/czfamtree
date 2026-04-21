/**
 * Deterministic avatar colour picker — maps any Clerk user id (text sub) to
 * one of four OKLCH accent colours. Identical inputs always produce the same
 * output so an avatar's background is stable across renders / tabs.
 *
 * Palette chosen to match UI-SPEC §Open Questions #3:
 *  - accent indigo, success green, warning gold, lilac
 */
const PALETTE = [
  'oklch(0.52 0.14 250)', // accent indigo
  'oklch(0.62 0.13 150)', // success green
  'oklch(0.72 0.14 75)',  // warning gold
  'oklch(0.70 0.10 300)', // lilac (UI-SPEC Open Q #3 4th color)
] as const;

export function hashUserIdToColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % PALETTE.length;
  return PALETTE[idx];
}

/**
 * Returns a 1-2 character uppercase initial string for an avatar overlay.
 * Handles single-word names (first two chars) and multi-word names (first
 * letter of first + last token). Falls back to `??` on empty input so the
 * avatar is never blank.
 */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
