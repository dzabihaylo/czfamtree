import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';

export type ClerkUserId = string & { __brand: 'ClerkUserId' };

export async function getUserIdOrNull(): Promise<ClerkUserId | null> {
  const { userId } = await auth();
  return (userId as ClerkUserId) ?? null;
}

export async function getUserIdOrThrow(): Promise<ClerkUserId> {
  const userId = await getUserIdOrNull();
  if (!userId) throw new Error('UNAUTHENTICATED');
  return userId;
}

export async function getUserProfile() {
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? 'You',
    email: user.primaryEmailAddress?.emailAddress ?? '',
    avatarUrl: user.imageUrl,
  };
}
