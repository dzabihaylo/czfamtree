'use server';

import { getUserIdOrThrow } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export type TreeListItem = {
  id: string;
  name: string;
  ownerUserId: string;
  role: 'owner' | 'editor' | 'viewer';
  memberCount: number;
  updatedAt: string;
};

/**
 * Lists every tree the current user is an active member of (owner + shared).
 * Ordered by tree.updated_at desc so the switcher surfaces the most recently
 * touched tree first. memberCount is 0 in Phase 1 (Phase 5 will aggregate it
 * once presence-count infrastructure lands).
 */
export async function listMyTrees(): Promise<TreeListItem[]> {
  const userId = await getUserIdOrThrow();
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('tree_members')
    .select(
      `
      role,
      tree:trees!inner(
        id,
        name,
        owner_user_id,
        updated_at
      )
    `,
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { foreignTable: 'trees', ascending: false });

  if (error) throw new Error(`listMyTrees failed: ${error.message}`);
  if (!data) return [];

  // Supabase's inferred type for the nested relation is `trees | trees[]` depending on the FK
  // cardinality detected at build time; the !inner modifier guarantees a single row.
  // Normalise via `any` coercion — the mapping is safe because we project each column explicitly.
  return data.map((row: any) => {
    const tree = Array.isArray(row.tree) ? row.tree[0] : row.tree;
    return {
      id: tree.id as string,
      name: tree.name as string,
      ownerUserId: tree.owner_user_id as string,
      role: row.role as 'owner' | 'editor' | 'viewer',
      memberCount: 0,
      updatedAt: tree.updated_at as string,
    };
  });
}

/**
 * Creates a brand-new tree for the current user by invoking the
 * `bootstrap_tree` RPC (plan 01-02). Returns the new tree_id so the caller
 * can router.push(`/tree/${newId}`).
 *
 * Default name is `Untitled tree` — the topbar's TreeSwitcher does NOT pass a
 * name; the user renames inline after navigation.
 */
export async function createNewTree(name = 'Untitled tree'): Promise<string> {
  const userId = await getUserIdOrThrow();
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('bootstrap_tree', {
    p_owner_user_id: userId,
    p_tree_name: name,
    p_seed_person_name: 'You',
  });
  if (error || !data) {
    throw new Error(`createNewTree failed: ${error?.message ?? 'unknown'}`);
  }
  return data as string;
}

/**
 * Renames a tree. Silently returns on empty-after-trim per UI-SPEC §Inline
 * tree rename ("Empty name: Revert to previous name; no error shown"). Caps
 * the name at 80 chars (defensive; the HTML input is also maxLength={80}).
 *
 * RLS enforces authorization — only tree owners/editors can UPDATE the row
 * per the `trees_update_if_owner_or_editor` policy (plan 01-02).
 */
export async function renameTree(treeId: string, name: string): Promise<void> {
  await getUserIdOrThrow();
  const trimmed = name.trim().slice(0, 80);
  if (trimmed.length === 0) return;
  const supabase = await supabaseServer();
  const { error } = await supabase.from('trees').update({ name: trimmed }).eq('id', treeId);
  if (error) throw new Error(`renameTree failed: ${error.message}`);
}
