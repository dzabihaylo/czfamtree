'use client';

import { useRef, useState, useTransition } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { renameTree } from '@/app/actions/trees';

export type TreeTitleProps = {
  treeId: string;
  name: string;
  peopleCount: number;
};

/**
 * Two-mode tree-name display.
 *
 * Display mode: button showing `{name} · 1 person` (singular/plural meta).
 *   Click → enter edit mode.
 *
 * Edit mode: bare text input (maxLength 80) with autofocus + select-all.
 *   Enter or blur → commit via `renameTree()` server action.
 *   Escape → revert to the pre-edit name (UI-SPEC §Inline tree rename).
 *   Empty-after-trim → silent revert (no toast in Phase 1).
 *   Server error → silent revert to the server-known name (rename is
 *     idempotent; the user can try again).
 *
 * Optimistic update: `displayName` flips immediately, then the server action
 * runs inside `startTransition` so the UI stays responsive.
 */
export default function TreeTitle({ treeId, name, peopleCount }: TreeTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [displayName, setDisplayName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const enterEdit = () => {
    setDraft(displayName);
    setIsEditing(true);
    // Autofocus + select-all on next paint so Enter-from-start works immediately.
    queueMicrotask(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const commit = () => {
    const trimmed = draft.trim().slice(0, 80);
    if (trimmed.length === 0) {
      // Silent revert (UI-SPEC §Inline tree rename "Empty name: Revert ... no error shown")
      setIsEditing(false);
      setDraft(displayName);
      return;
    }
    setDisplayName(trimmed); // optimistic
    setIsEditing(false);
    startTransition(async () => {
      try {
        await renameTree(treeId, trimmed);
      } catch {
        // Silent revert on server error; no toast infra in Phase 1
        setDisplayName(name);
      }
    });
  };

  const cancel = () => {
    setIsEditing(false);
    setDraft(displayName);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="w-full border border-rule bg-bg-card text-[14px] text-ink focus:border-accent focus:outline-none"
        style={{ padding: '8px 12px' }}
        value={draft}
        maxLength={80}
        placeholder="Name your tree"
        onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        aria-label="Rename tree"
      />
    );
  }

  const meta = peopleCount === 1 ? '· 1 person' : `· ${peopleCount} people`;

  return (
    <button
      type="button"
      onClick={enterEdit}
      title="Click to rename"
      className="flex items-baseline gap-[8px] text-left hover:bg-bg-soft transition-colors"
      style={{ padding: '4px 8px' }}
    >
      <span className="text-[13px] font-semibold tracking-[-0.005em] text-ink">{displayName}</span>
      <span className="font-mono text-[11px] text-ink-3">{meta}</span>
    </button>
  );
}
