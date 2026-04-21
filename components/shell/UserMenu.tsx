'use client';

import { useEffect, useRef, useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import Avatar from './Avatar';
import { hashUserIdToColor, initialsFromName } from '@/lib/utils/hashUserId';

export type UserMenuProps = {
  userId: string;
  displayName: string;
  email: string;
};

/**
 * Avatar trigger + dropdown with user-identity header row and a Sign out
 * action. 240px wide, right-aligned to the avatar. Swiss card with 4px hard
 * shadow, 4px vertical padding, rule-soft divider below the header.
 *
 * Sign-out: calls Clerk `signOut({ redirectUrl: '/sign-in' })`. No
 * confirmation dialog — UI-SPEC §Destructive explicitly accepts sign-out as
 * non-destructive ("No copy needed for a confirmation since there is none").
 */
export default function UserMenu({ userId, displayName, email }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { signOut } = useClerk();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => window.addEventListener('mousedown', onMouseDown), 10);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    signOut({ redirectUrl: '/sign-in' });
  };

  const initials = initialsFromName(displayName);
  const bgColor = hashUserIdToColor(userId);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open user menu"
        aria-expanded={open}
        title={`${displayName} · ${email}`}
      >
        <Avatar initials={initials} size={32} bgColor={bgColor} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 bg-bg-card border border-ink"
          style={{
            top: 'calc(100% + 4px)',
            width: 240,
            boxShadow: '4px 4px 0 var(--ink)',
            padding: '4px 0',
          }}
        >
          {/* Header row (non-clickable) */}
          <div style={{ padding: '12px 16px' }} className="border-b border-rule-soft">
            <div className="text-[13px] font-semibold text-ink">{displayName}</div>
            <div className="font-mono text-[11px] text-ink-3">{email}</div>
          </div>

          {/* Sign out row */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-[8px] text-left text-[13px] font-semibold text-ink hover:bg-bg-soft"
            style={{ padding: '12px 16px' }}
          >
            <LogOut size={14} className="text-ink-2" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
