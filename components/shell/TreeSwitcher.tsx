'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus } from 'lucide-react';
import { listMyTrees, createNewTree, type TreeListItem } from '@/app/actions/trees';

export type TreeSwitcherProps = { currentTreeId: string };

/**
 * Chevron-triggered dropdown next to TreeTitle. Lists the user's owned trees
 * and trees shared with them in two sections + a "+ New tree" action.
 *
 * Pattern: Swiss-card dropdown (4px hard shadow), 280px wide, anchored 4px
 * below the trigger. Outside-click + Escape close using the handoff
 * `setTimeout(10)` trick so the opening click doesn't immediately self-close.
 */
export default function TreeSwitcher({ currentTreeId }: TreeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [trees, setTrees] = useState<TreeListItem[] | null>(null);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Lazy-fetch on first open; subsequent opens reuse the cached list.
  useEffect(() => {
    if (open && trees === null) {
      listMyTrees()
        .then(setTrees)
        .catch(() => setTrees([]));
    }
  }, [open, trees]);

  // Outside-click + Escape close (handoff components.jsx L86-97)
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
    // setTimeout trick — the click that OPENED the dropdown would otherwise
    // bubble to the freshly-installed mousedown handler and immediately close it.
    const timer = window.setTimeout(() => window.addEventListener('mousedown', onMouseDown), 10);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  const goToTree = useCallback(
    (id: string) => {
      setOpen(false);
      router.push(`/tree/${id}`);
    },
    [router],
  );

  const handleCreate = useCallback(() => {
    startTransition(async () => {
      const newId = await createNewTree('Untitled tree');
      setOpen(false);
      router.push(`/tree/${newId}`);
    });
  }, [router]);

  const owned = (trees ?? []).filter((t) => t.role === 'owner');
  const shared = (trees ?? []).filter((t) => t.role !== 'owner');

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch tree"
        aria-expanded={open}
        className="inline-flex items-center text-ink-2 hover:text-ink transition-colors"
        style={{ padding: '4px 6px' }}
      >
        <ChevronDown size={13} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-50 bg-bg-card border border-ink"
          style={{
            top: 'calc(100% + 4px)',
            width: 280,
            boxShadow: '4px 4px 0 var(--ink)',
            padding: '4px 0',
          }}
        >
          {/* YOUR TREES section */}
          <div
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3"
            style={{ padding: '8px 12px 4px' }}
          >
            YOUR TREES
          </div>
          {owned.length === 0 && trees !== null && (
            <div className="text-[13px] text-ink-3" style={{ padding: '8px 16px' }}>
              &mdash;
            </div>
          )}
          {owned.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goToTree(t.id)}
              className={`block w-full text-left text-[13px] font-semibold text-ink hover:bg-bg-soft ${
                t.id === currentTreeId ? 'border-l-[4px] border-accent' : ''
              }`}
              style={{ padding: '12px 16px' }}
            >
              {t.name}
            </button>
          ))}

          {/* Divider + SHARED WITH YOU section (hidden when empty) */}
          {shared.length > 0 && (
            <>
              <div className="h-[1px] bg-rule-soft" />
              <div
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3"
                style={{ padding: '8px 12px 4px' }}
              >
                SHARED WITH YOU
              </div>
              {shared.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => goToTree(t.id)}
                  className={`block w-full text-left text-[13px] font-semibold text-ink hover:bg-bg-soft ${
                    t.id === currentTreeId ? 'border-l-[4px] border-accent' : ''
                  }`}
                  style={{ padding: '12px 16px' }}
                >
                  {t.name}
                </button>
              ))}
            </>
          )}

          {/* Divider + + New tree */}
          <div className="h-[1px] bg-rule-soft" />
          <button
            type="button"
            onClick={handleCreate}
            className="flex w-full items-center gap-[8px] text-left text-[13px] font-semibold text-ink hover:bg-bg-soft"
            style={{ padding: '12px 16px' }}
          >
            <Plus size={13} />
            New tree
          </button>
        </div>
      )}
    </div>
  );
}
