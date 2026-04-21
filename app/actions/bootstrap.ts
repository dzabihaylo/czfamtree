'use server';

import { getUserIdOrThrow, getUserProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Called from app/page.tsx on the root route. Returns the tree id the user
 * should be redirected to.
 *
 * Logic:
 *  1. If user has any trees they own or are a member of, return their most-recent.
 *  2. Else call the `bootstrap_tree` RPC — atomically creates tree + owner
 *     membership + seed "You" person under SECURITY DEFINER.
 *
 * Idempotency: single RSC request is safe. Double-tab on first sign-in is
 * acceptable (worst case: two trees; user can delete one from the switcher).
 */
export async function resolveOrBootstrapTree(): Promise<string> {
  const userId = await getUserIdOrThrow();
  const supabase = await supabaseServer();

  // Step 1: find an existing tree (owned or invited)
  const { data: memberships } = await supabase
    .from('tree_members')
    .select('tree_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (memberships && memberships.length > 0) {
    return memberships[0].tree_id;
  }

  // Step 2: bootstrap a new tree atomically via RPC
  const profile = await getUserProfile();
  const initialName = 'My family tree';

  const { data, error } = await supabase.rpc('bootstrap_tree', {
    p_owner_user_id: userId,
    p_tree_name: initialName,
    p_seed_person_name: profile?.displayName ?? 'You',
  });

  if (error || !data) {
    throw new Error(`Failed to bootstrap tree: ${error?.message ?? 'unknown'}`);
  }
  return data as string;
}
