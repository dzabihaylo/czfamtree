'use server';

import { getUserIdOrThrow } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { PersonPatchSchema, toDbPatch, type PersonPatch } from '@/lib/schemas/person';

/**
 * Field-edit persistence. Client batches dirty fields for one person into a
 * single patch; this action validates via Zod (.strict rejects unknown keys —
 * load-bearing for threat model T-02-01 mass assignment), maps camelCase to
 * snake_case, and writes under RLS.
 *
 * The tree_id equality predicate is defense-in-depth against cross-tree
 * writes — RLS already blocks it, but the redundant WHERE locks the blast
 * radius if `people_update_if_editor_or_owner` ever regresses.
 */
export async function updatePerson(
  treeId: string,
  personId: string,
  patch: PersonPatch,
): Promise<void> {
  await getUserIdOrThrow();
  const parsed = PersonPatchSchema.parse(patch);
  const dbPatch = toDbPatch(parsed);
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('people')
    .update(dbPatch)
    .eq('id', personId)
    .eq('tree_id', treeId);
  if (error) {
    // Only message — never hint/details/code (threat model T-02-04 leakage).
    throw new Error(`updatePerson failed: ${error.message}`);
  }
}

/**
 * Drag-end position commit. Kept separate from updatePerson so the client
 * save-queue can reason about move-save vs field-save as independent channels
 * (UI-SPEC §7 rule 8). Reuses PersonPatchSchema for finite-number validation.
 */
export async function movePerson(
  treeId: string,
  personId: string,
  x: number,
  y: number,
): Promise<void> {
  await getUserIdOrThrow();
  const parsed = PersonPatchSchema.parse({ x, y });
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('people')
    .update({ x: parsed.x, y: parsed.y })
    .eq('id', personId)
    .eq('tree_id', treeId);
  if (error) throw new Error(`movePerson failed: ${error.message}`);
}

/**
 * Hard delete a person. RLS (`people_delete_if_editor_or_owner`) blocks
 * non-members; is_me prevention is a client-side check (PANEL-08) not a
 * server check — we accept a follow-up DB trigger as future hardening.
 */
export async function removePerson(treeId: string, personId: string): Promise<void> {
  await getUserIdOrThrow();
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', personId)
    .eq('tree_id', treeId);
  if (error) throw new Error(`removePerson failed: ${error.message}`);
}
