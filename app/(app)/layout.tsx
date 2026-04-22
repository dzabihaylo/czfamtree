import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getUserIdOrNull } from '@/lib/auth';
import { TreeStoreProvider } from '@/lib/store/tree-store';

/**
 * Authenticated route-group layout. Any route under `app/(app)/...` is
 * guarded by a server-side auth check — if Clerk's middleware was somehow
 * bypassed (CVE-2025-29927 class of attacks), this RSC still rejects the
 * request by redirecting to `/sign-in`.
 *
 * Uses `getUserIdOrNull()` (NOT ...OrThrow) so we redirect cleanly instead of
 * crashing into the default error boundary.
 *
 * Phase 2: wraps children with `<TreeStoreProvider>` so <TopBar> and the
 * client-component <TreeCanvas> share a single Zustand store instance. The
 * Provider itself is a client component — React renders it inside this RSC
 * boundary.
 */
export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const userId = await getUserIdOrNull();
  if (!userId) redirect('/sign-in');
  return (
    <main className="relative min-h-screen bg-bg text-ink">
      <TreeStoreProvider>{children}</TreeStoreProvider>
    </main>
  );
}
