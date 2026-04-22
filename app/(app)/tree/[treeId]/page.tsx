import { getUserIdOrThrow, getUserProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import TopBar from '@/components/shell/TopBar';
import AuthError from '@/components/shell/AuthError';
import TreeCanvas from '@/components/canvas/TreeCanvas';

export const dynamic = 'force-dynamic';

type PageParams = { params: Promise<{ treeId: string }> };

/**
 * Tree detail route. Renders the authenticated shell for a single tree:
 *
 *   <TopBar>      (52px — brand, title, switcher, avatar)
 *   <TreeCanvas>  (Phase 2 canvas: pan/zoom, PersonNode cards, edges)
 *
 * RLS is the authz boundary. An unauthorised treeId returns 0 rows from the
 * SELECT → we render `<AuthError variant="rls-reject" />` with UI-SPEC copy.
 *
 * `dynamic = 'force-dynamic'` because the RSC reads Clerk `auth()` — static
 * prerender would fail without request context.
 *
 * Phase 2: the people SELECT widens from the Phase 1 minimal set to the full
 * column list needed for canvas rendering + side-panel editing
 * (gender, pronouns, birth/death years, birth_place, notes, spouse_ids,
 * parent_ids, child_ids). `<TreeCanvas>` converts snake_case → camelCase on
 * hydrate via `personFromRow`.
 */
export default async function TreePage({ params }: PageParams) {
  const { treeId } = await params;
  await getUserIdOrThrow(); // defense-in-depth (Pitfall 1-6)
  const profile = await getUserProfile();
  const supabase = await supabaseServer();

  const { data: tree, error: treeErr } = await supabase
    .from('trees')
    .select('id, name, owner_user_id')
    .eq('id', treeId)
    .maybeSingle();

  if (treeErr) throw new Error(`Load tree failed: ${treeErr.message}`);
  if (!tree) {
    // RLS blocked or tree doesn't exist — both cases surface the same UX
    return <AuthError variant="rls-reject" />;
  }

  const { data: people, error: peopleErr } = await supabase
    .from('people')
    .select(
      'id, name, gender, pronouns, birth_year, death_year, birth_place, notes, spouse_ids, parent_ids, child_ids, x, y, is_me',
    )
    .eq('tree_id', treeId);

  if (peopleErr) throw new Error(`Load people failed: ${peopleErr.message}`);
  const peopleList = people ?? [];

  return (
    <>
      <TopBar
        currentTreeId={tree.id}
        treeName={tree.name}
        peopleCount={peopleList.length}
        userId={profile?.id ?? ''}
        displayName={profile?.displayName ?? 'You'}
        email={profile?.email ?? ''}
      />
      <TreeCanvas tree={tree} people={peopleList} />
    </>
  );
}
