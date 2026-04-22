import { getUserIdOrThrow, getUserProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import TopBar from '@/components/shell/TopBar';
import EmptyTreeOverlay from '@/components/shell/EmptyTreeOverlay';
import AuthError from '@/components/shell/AuthError';

export const dynamic = 'force-dynamic';

type PageParams = { params: Promise<{ treeId: string }> };

/**
 * Tree detail route (Phase 1 shell). Renders the authenticated shell for a
 * single tree:
 *
 *   <TopBar>  (52px — brand, title, switcher, avatar)
 *   <section>  (canvas region; Phase 2 mounts <TreeCanvas> here)
 *     <EmptyTreeOverlay />  (greeting while only the seed exists)
 *
 * RLS is the authz boundary. An unauthorised treeId returns 0 rows from the
 * SELECT → we render `<AuthError variant="rls-reject" />` with UI-SPEC copy.
 *
 * `dynamic = 'force-dynamic'` because the RSC reads Clerk `auth()` — static
 * prerender would fail without request context.
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
    .select('id, name, x, y, is_me')
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

      {/* Canvas region — Phase 1 shell (static canvas primitives deleted
          per D-08). Plan 02 mounts <TreeCanvas tree={tree}
          people={peopleList} /> here; EmptyTreeOverlay moves inside it. */}
      <section
        aria-label="Family tree canvas"
        className="relative"
        style={{ minHeight: 'calc(100vh - 52px)' }}
        tabIndex={0}
      >
        {/* Canvas body — Plan 02 mounts <TreeCanvas tree={tree} people={peopleList} /> here. */}
        {peopleList.length <= 1 && <EmptyTreeOverlay />}
      </section>
    </>
  );
}
