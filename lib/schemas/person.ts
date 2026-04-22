import { z } from 'zod';
import type { Database } from '@/lib/supabase/types';

export const GenderSchema = z.enum(['m', 'f', 'x', 'u']);

// strict() is load-bearing — Phase 2 threat model T-02-01 (mass assignment) relies on
// this: a Server Action call with unknown fields throws before reaching Supabase,
// preventing write-path smuggling of columns like tree_id, is_me, owner_user_id, etc.
export const PersonPatchSchema = z
  .object({
    name: z.string().max(200).optional(),
    gender: GenderSchema.optional(),
    pronouns: z.string().max(80).nullable().optional(),
    birthYear: z.number().int().min(0).max(3000).nullable().optional(),
    deathYear: z.number().int().min(0).max(3000).nullable().optional(),
    birthPlace: z.string().max(200).nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
  })
  .strict();

export type PersonPatch = z.infer<typeof PersonPatchSchema>;

type PeopleUpdate = Database['public']['Tables']['people']['Update'];

/** Maps the Zod (camelCase) patch to Supabase (snake_case) Update shape. Only
 *  columns listed in the Zod schema are emitted — tree_id / is_me / ids arrays
 *  cannot leak through because PersonPatch doesn't include them. */
export function toDbPatch(patch: PersonPatch): PeopleUpdate {
  const out: PeopleUpdate = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.gender !== undefined) out.gender = patch.gender;
  if (patch.pronouns !== undefined) out.pronouns = patch.pronouns;
  if (patch.birthYear !== undefined) out.birth_year = patch.birthYear;
  if (patch.deathYear !== undefined) out.death_year = patch.deathYear;
  if (patch.birthPlace !== undefined) out.birth_place = patch.birthPlace;
  if (patch.notes !== undefined) out.notes = patch.notes;
  if (patch.x !== undefined) out.x = patch.x;
  if (patch.y !== undefined) out.y = patch.y;
  return out;
}
