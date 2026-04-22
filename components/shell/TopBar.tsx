import BrandMark from './BrandMark';
import TreeTitle from './TreeTitle';
import TreeSwitcher from './TreeSwitcher';
import UserMenu from './UserMenu';

export type TopBarProps = {
  currentTreeId: string;
  treeName: string;
  peopleCount: number;
  userId: string;
  displayName: string;
  email: string;
};

/**
 * 52px sticky top shell. Layout (left→right):
 *
 *   [BrandMark + "Family Tree" wordmark] | [TreeTitle + TreeSwitcher] ---> [UserMenu]
 *
 * - `role="banner"` landmark (UI-SPEC Accessibility)
 * - 52px height per DESIGN-03 pixel-parity (NOT 56px — see UI-SPEC Open Q #1)
 * - sticky top-0 z-50 so it stays visible above the canvas (Phase 2 concern,
 *   locked now)
 *
 * No Share/Sheets/presence here — those land in Phase 5.
 */
export default function TopBar({
  currentTreeId,
  treeName,
  peopleCount,
  userId,
  displayName,
  email,
}: TopBarProps) {
  return (
    <header
      data-topbar
      role="banner"
      className="sticky top-0 left-0 right-0 z-50 flex items-center gap-lg bg-bg border-b border-rule"
      style={{ height: 52, padding: '0 16px' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-md">
        <BrandMark size="sm" />
        <span className="text-[14px] font-semibold tracking-[-0.005em] text-ink">Family Tree</span>
      </div>

      {/* Vertical rule */}
      <div style={{ width: 1, height: 24, background: 'var(--rule)' }} />

      {/* Tree title + switcher chevron */}
      <div className="flex items-center gap-0">
        <TreeTitle treeId={currentTreeId} name={treeName} peopleCount={peopleCount} />
        <TreeSwitcher currentTreeId={currentTreeId} />
      </div>

      {/* Flex-grow spacer */}
      <div className="flex-1" />

      {/* User avatar → menu */}
      <UserMenu userId={userId} displayName={displayName} email={email} />
    </header>
  );
}
