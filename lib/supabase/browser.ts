'use client';
import { useSession } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { useMemo } from 'react';
import type { Database } from './types';

export function useSupabaseBrowser() {
  const { session } = useSession();
  return useMemo(
    () =>
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_KEY!,
        {
          async accessToken() {
            return session?.getToken() ?? null;
          },
        },
      ),
    [session],
  );
}
