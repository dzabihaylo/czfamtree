import { redirect } from 'next/navigation';
import { resolveOrBootstrapTree } from './actions/bootstrap';

export const dynamic = 'force-dynamic';

export default async function Root() {
  const treeId = await resolveOrBootstrapTree();
  redirect(`/tree/${treeId}`);
}
