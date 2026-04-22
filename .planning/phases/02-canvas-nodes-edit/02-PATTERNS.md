# Phase 2: Canvas, Nodes & Edit - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 13 new files + 5 modified files + 2 deleted files + 1 docs edit
**Analogs found:** 18 / 20 (in-codebase analogs + handoff source); 2 NEW (no analog — greenfield).

> **Upstream reads:**
> - `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/.planning/phases/02-canvas-nodes-edit/02-CONTEXT.md` (16 locked decisions D-01..D-16)
> - `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/.planning/phases/02-canvas-nodes-edit/02-UI-SPEC.md` (component inventory, spacing, interaction contract)
> - `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/CLAUDE.md` (tech stack + GSD enforcement)
>
> **Schema note (IMPORTANT):** `lib/supabase/types.ts` already includes `pronouns text | null` on the `people` table (see L102, L121, L141) **and** the initial migration `supabase/migrations/20260421000000_initial_schema.sql` L48 already defines `pronouns text`. D-05's "ship pronouns column in Phase 2" mini-migration is therefore a **no-op on disk** — the migration file MAY still be created as a belt-and-suspenders idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS pronouns` statement, but the `[BLOCKING] supabase db push` step will succeed without changes. Planner should either (a) skip the migration task entirely and remove the `[BLOCKING]` dependency OR (b) ship the idempotent `IF NOT EXISTS` migration and note in the plan that types don't need regeneration. Recommended: path (a) — remove the migration + types-regen task; keep only the `<FieldInput name="pronouns">` wiring. Flag this for user acknowledgement before planning.

---

## File Classification

### Server Actions (mutations)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `app/actions/people.ts` (new) | Server Action module | request-response + CRUD | `app/actions/trees.ts` | exact |

### Zod Schemas

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `lib/schemas/person.ts` (new) | Zod schema + inferred types | static | NEW — no existing `lib/schemas/` directory in codebase; derive from `lib/supabase/types.ts` `Database['public']['Tables']['people']['Update']` shape (L128-146) | NEW |

### Graph Logic

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `lib/graph/edges.ts` (new) | pure utility / graph algorithm | transform | **`design_handoff_family_tree/source/model.jsx`** L45-62 (`computeEdges`) + L94-115 (`spousePath`, `parentPath`) | exact — verbatim port |

### Hooks

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `lib/hooks/useSaveQueue.ts` (new) | custom React hook + async queue | event-driven | NEW — no existing custom-hook analog; closest async-queue mental model is the `useTransition` + `startTransition(async …)` pattern in `components/shell/TreeTitle.tsx` L55-63 | partial (async pattern only) |

### Store Slice (modification)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `lib/store/tree-store.ts` (extend) | Zustand store factory (extend `TreeState`) | event-driven | self (Phase 1) — extends its own existing shape; handoff pattern at `App.jsx` L22-51 is the anti-pattern | exact (self-extension) |

### CSS Tokens (modification)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `app/globals.css` (extend) | Tailwind v4 `@theme` block | static | self (Phase 1) — extends Phase 1's `@theme` block at L23-55 with new `--gender-*` and save-state CSS variables | exact (self-extension) |

### React Canvas Components (all new)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `components/canvas/TreeCanvas.tsx` (new) | client component root (canvas orchestrator) | event-driven | **`design_handoff_family_tree/source/app.jsx`** L17-136 + L380-449 (full `<App>` component — pan/zoom state + canvas-wrap render) | role-match (subset — no radial/toolbar/share) |
| `components/canvas/PanZoomWrapper.tsx` (new, optional extraction) | client component (canvas viewport + wheel/drag handlers) | event-driven | **`design_handoff_family_tree/source/app.jsx`** L95-172 (`onCanvasMouseDown`, `onMove`/`onUp` useEffect, `onWheel`, `zoomBy`, `fitView`) | exact — lift handlers 1:1 |
| `components/canvas/EdgeLayer.tsx` (new) | client component (SVG overlay) | transform (derived from store) | **`design_handoff_family_tree/source/app.jsx`** L327-337 (bbox memo) + L393-409 (`<svg className="edges">` render loop) | exact |
| `components/canvas/PersonNode.tsx` (new) | client component (180×76 card) | event-driven (mouseDown/dblclick) | **`design_handoff_family_tree/source/components.jsx`** L5-72 (`PersonNode`) — strip `showPhoto`/`showRelation` props, keep `.node` + `.selected` + `.is-me` + `+` button | exact (dimensions overridden to 180×76 per REQ NODE-01) |
| `components/canvas/AvatarCircle.tsx` (new) | client component (40px circle) | static render | `components/shell/Avatar.tsx` | role-match (different size + color source) |
| `components/canvas/SidePanel.tsx` (new) | client component (380px right-dock) | event-driven + request-response | **`design_handoff_family_tree/source/components.jsx`** L128-251 (`SidePanel`) + `app/globals.css` handoff classes `.side-panel`, `.side-panel-header`, `.side-panel-content`, `.side-panel-section`, `.field-input`, `.field-label` | exact — adapt handoff JSX to TSX+Tailwind |
| `components/canvas/SavePill.tsx` (new) | client component (state-driven pill) | event-driven (subscribes to store slice) | **`design_handoff_family_tree/source/components.jsx`** L143-159 (inline span in SidePanel header) | exact (extract inline into component + 5 states) |
| `components/canvas/SaveErrorToast.tsx` (new) | client component (transient toast) | event-driven (timeout auto-dismiss) | **`design_handoff_family_tree/source/styles.css`** L544-560 (`.toast`) + **`app.jsx`** L54-58 (`showToast` helper + L566 render) | exact (styling) + partial (React-local impl, not global queue) |
| `components/canvas/fields/FieldInput.tsx` (new) | client component (text input wrapper) | event-driven | **`design_handoff_family_tree/source/styles.css`** L108-124 (`.field-label`, `.field-input`) + `components/shell/TreeTitle.tsx` L84-95 (bare text input pattern) | role-match (form variant) |
| `components/canvas/fields/FieldTextarea.tsx` (new) | client component (4-row textarea) | event-driven | **`design_handoff_family_tree/source/components.jsx`** L206-213 (`<textarea>` inside Notes section) | exact |
| `components/canvas/fields/GenderSelect.tsx` (new) | client component (3-button segmented) | event-driven | **`design_handoff_family_tree/source/components.jsx`** L186-196 (`{[['m','Male'],...].map(...)`) | exact |
| `components/canvas/RelationsList.tsx` (new) | client component (read-only clickable name list) | event-driven (onClick → select) | **`design_handoff_family_tree/source/components.jsx`** L216-223 (Relations section) | exact |

### RSC Plumbing (modification)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `app/(app)/tree/[treeId]/page.tsx` (extend) | Page RSC (authz + data fetch) | request-response | self (Phase 1) — replace inline `<GridBackground/>`+`<SeedPersonNode/>` render with `<TreeCanvas tree={…} people={…} />`; keep RSC data-fetch pattern L29-54 | exact (self-extension) |

### Supabase (modifications / possibly no-op — see schema note above)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `supabase/migrations/0002_add_pronouns.sql` (new — likely NO-OP) | migration | batch | `supabase/migrations/20260421000000_initial_schema.sql` L42-73 (people table DDL + constraints). **Column already exists** — file is optional/idempotent. | exact (pattern) / NO-OP (effect) |
| `lib/supabase/types.ts` (regenerate — likely NO-OP) | generated types | static | self (Phase 1) — already includes `pronouns text | null` at L102, L121, L141 | exact (no change expected) |

### Deletions

| File | Role | Why Deleted |
|------|------|-------------|
| `components/shell/SeedPersonNode.tsx` | component | Replaced by `components/canvas/PersonNode.tsx` with `is_me` variant (D-08 / UI-SPEC Reconciliation table) |
| `components/shell/GridBackground.tsx` | component | Grid moves INSIDE the transform wrapper — apply `.grid-bg` utility class (already in `app/globals.css` L67-72) directly on the new `<div class="canvas-inner">` (D-08 / UI-SPEC Reconciliation row 2) |

### Docs Edits

| File | Role | What to Change |
|------|------|----------------|
| `.planning/REQUIREMENTS.md` (edit) | docs | Per D-08: CANV-01 "56px topbar"→"52px topbar"; CANV-02 "8px, --ink-4 @ 10% opacity"→"24px, --rule-soft"; DATA-01 append `pronouns text`. |
| `.planning/PROJECT.md` (edit) | docs | Per D-08: add Key Decisions row for pronouns column. |

---

## Pattern Assignments

> All code paths below are **absolute paths**. Handoff excerpts use the UMD/global syntax of the prototype (`window.FamilyModel`, `React.useState`, bare CSS classes); Phase 2 implementation MUST adapt these to the project's Next 16 / RSC / Zustand / Tailwind-v4 idioms while preserving structure, dimensions, and copy.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/actions/people.ts` (Server Action, CRUD)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/actions/trees.ts`

**Server Action header pattern** (`app/actions/trees.ts` L1-4 + L112-119):
```typescript
'use server';

import { getUserIdOrThrow } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
// ...
export async function renameTree(treeId: string, name: string): Promise<void> {
  await getUserIdOrThrow();
  const trimmed = name.trim().slice(0, 80);
  if (trimmed.length === 0) return;
  const supabase = await supabaseServer();
  const { error } = await supabase.from('trees').update({ name: trimmed }).eq('id', treeId);
  if (error) throw new Error(`renameTree failed: ${error.message}`);
}
```

**Apply this shape to (D-01):**
- `updatePerson(treeId: string, personId: string, patch: PersonPatch): Promise<void>` — validates `patch` via `PersonPatchSchema.parse(patch)` (from `lib/schemas/person.ts`), then `supabase.from('people').update(dbPatch).eq('id', personId).eq('tree_id', treeId)`. Include `tree_id` in the WHERE to defense-in-depth against cross-tree writes; RLS is authoritative.
- `movePerson(treeId: string, personId: string, x: number, y: number): Promise<void>` — identical shape, patch is `{ x, y }`. Keep separate from `updatePerson` so drag save-path vs field-edit save-path can be reasoned about independently (UI-SPEC §7 rule 8).
- `removePerson(treeId: string, personId: string): Promise<void>` — `supabase.from('people').delete().eq('id', personId).eq('tree_id', treeId)`. RLS policy `people_delete_if_editor_or_owner` enforces authz (migration L256-270).

**Error-wrap pattern** — all three functions throw `new Error('<fnName> failed: <msg>')` so the client `useSaveQueue` can branch on `.message`.

**Return type** — void for all three; client refreshes its store optimistically and relies on pill state for feedback (D-02, UI-SPEC §7).

**Key ID mapping (UI-SPEC Open Q #14):**
- UI label `LOCATION` ↔ DB column `birth_place` ↔ React state key `birthPlace`.
- Zod schema uses camelCase keys; Server Action maps to snake_case `birth_place` / `birth_year` / `death_year` / `is_me` before the Supabase call.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/schemas/person.ts` (Zod schema)

**Analog:** NEW (no existing `lib/schemas/` dir). Source DB types shape — `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/supabase/types.ts` L128-146.

**DB Update type to mirror** (types.ts L128-146):
```typescript
Update: {
  birth_place?: string | null
  birth_year?: number | null
  child_ids?: string[]
  created_at?: string
  death_year?: number | null
  gender?: Database["public"]["Enums"]["gender"]  // 'm' | 'f' | 'x' | 'u'
  id?: string
  is_me?: boolean
  name?: string
  notes?: string | null
  parent_ids?: string[]
  pronouns?: string | null
  spouse_ids?: string[]
  tree_id?: string
  updated_at?: string
  x?: number
  y?: number
}
```

**Zod shape to produce (D-04) — camelCase public API, snake_case bridging done in the Server Action:**
```typescript
import { z } from 'zod';

export const GenderSchema = z.enum(['m', 'f', 'x', 'u']);

export const PersonPatchSchema = z.object({
  name: z.string().max(200).optional(),
  gender: GenderSchema.optional(),
  pronouns: z.string().max(80).nullable().optional(),
  birthYear: z.number().int().min(0).max(3000).nullable().optional(),
  deathYear: z.number().int().min(0).max(3000).nullable().optional(),
  birthPlace: z.string().max(200).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
}).strict();

export type PersonPatch = z.infer<typeof PersonPatchSchema>;
```

**Keep alignment with handoff field set** (`design_handoff_family_tree/source/components.jsx` L170-213 — name, birthYear, deathYear, gender, location→birthPlace, notes).

**Resolver import (RHF side-panel):**
```typescript
import { zodResolver } from '@hookform/resolvers/zod'; // already installed
```

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/hooks/useSaveQueue.ts` (custom hook)

**Analog:** partial — `components/shell/TreeTitle.tsx` L29-64 (local-mirror + `startTransition(async …)` + silent-revert-on-error). Not a queue, but the same "optimistic-local + authoritative-server" mental model.

**TreeTitle pattern to generalize** (`components/shell/TreeTitle.tsx` L46-64):
```typescript
const commit = () => {
  const trimmed = draft.trim().slice(0, 80);
  if (trimmed.length === 0) {
    setIsEditing(false);
    setDraft(displayName);
    return;
  }
  setDisplayName(trimmed); // optimistic
  setIsEditing(false);
  startTransition(async () => {
    try {
      await renameTree(treeId, trimmed);
    } catch {
      setDisplayName(name); // silent revert
    }
  });
};
```

**Hook responsibilities (D-03, D-11, D-14, UI-SPEC §7):**

1. **Debounce timer per field** (400ms) — each `enqueue(personId, field, value)` call sets/resets a timer for that `(personId, field)` pair.
2. **Batched payload per person** — when ANY of person P's field timers fire, collect ALL dirty fields for P, call `updatePerson(treeId, P, batchedPatch)` ONCE, clear the timers.
3. **Serial queue per person** (SAVE-04) — if a save for P is in-flight when another field debounce for P fires, the new payload is merged into a `pending` slot and awaits the in-flight Promise. On resolve, the merged pending payload becomes the next in-flight. Never two concurrent requests to the same P.
4. **State-machine writes** — the hook is the ONLY writer to `saveStateByPersonId[P]` in the Zustand slice. Transitions: `idle → saving (on fetch start) → saved (on 2xx, 1.4s timer back to idle) | error (on 4xx/5xx/throw)`. UI-SPEC §7 rule 4.
5. **`flush(personId)` method** — synchronously fires any pending timer for P, so `<SidePanel>` can call `queue.flush(personId)` in its unmount cleanup (UI-SPEC §7 rule 6 + D-11).
6. **Error surface** — on save failure, write `error` into the store slice AND dispatch a toast via a separate `onError` callback prop (consumed by `<SaveErrorToast>` mount). Retry re-invokes with the same payload.

**Hook signature (planner's discretion, but recommended):**
```typescript
export function useSaveQueue(treeId: string): {
  enqueueField: (personId: string, field: keyof PersonPatch, value: unknown) => void;
  flush: (personId: string) => void;
  retry: (personId: string) => void;
};
```

**Drag-save channel (UI-SPEC §7 rule 8):** drag-end commit calls a sibling `enqueueMove(personId, x, y)` path that shares the serial-per-person queue. Pill is tied to `selectedPersonId`, NOT to the dragged person — drag-save of a non-selected person surfaces as toast only (UI-SPEC Copywriting "Couldn't save move for {name}").

**Zundo integration:** NOT wired in Phase 2 (D-06). Queue actions do not call `temporal().undo()`/`redo()`.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/graph/edges.ts` (graph utility)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/model.jsx` L45-62 + L87-88 + L94-115 — port **verbatim** (D-13).

**Port exactly** (model.jsx L45-62):
```javascript
// Compute edges from people
function computeEdges(people) {
  const edges = [];
  const seen = new Set();
  for (const p of people) {
    // Spouse edges (deduped)
    for (const sid of (p.spouseIds || [])) {
      const key = [p.id, sid].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ kind: 'spouse', a: p.id, b: sid });
    }
    // Parent->child edges
    for (const pid of (p.parentIds || [])) {
      edges.push({ kind: 'parent', a: pid, b: p.id });
    }
  }
  return edges;
}
```

**Key-name mapping (handoff camelCase → DB snake_case):** the handoff `spouseIds`/`parentIds` map to DB `spouse_ids`/`parent_ids`. The store's `Person` shape should carry camelCase (matches the Zod schema). Hydration from RSC-fetched rows converts `spouse_ids → spouseIds` once, at the RSC/store-hydrate boundary.

**Path helpers** (model.jsx L87-88, L94-115) — constants + path functions:
```javascript
const NODE_W = 168;       // Phase 2 OVERRIDE: 180 per REQ NODE-01
const NODE_H = 236;       // Phase 2 OVERRIDE: 76  per REQ NODE-01

function spousePath(a, b) {
  const ay = a.y + 70; // Phase 2: use NODE_H / 2 = 38
  const by = b.y + 70;
  const x1 = a.x + NODE_W;
  const x2 = b.x;
  if (x2 < x1) return `M ${a.x + NODE_W / 2} ${ay} L ${b.x + NODE_W / 2} ${by}`;
  return `M ${x1} ${ay} L ${x2} ${by}`;
}

function parentPath(parent, child) {
  const px = parent.x + NODE_W / 2;
  const py = parent.y + NODE_H;  // 76 in Phase 2
  const cx = child.x + NODE_W / 2;
  const cy = child.y;
  const mid = (py + cy) / 2;
  return `M ${px} ${py} L ${px} ${mid} L ${cx} ${mid} L ${cx} ${cy}`;
}
```

**Phase 2 overrides:**
- `NODE_W = 180` (REQ NODE-01)
- `NODE_H = 76` (REQ NODE-01)
- Replace the handoff magic `+ 70` (photo card midline) with `+ NODE_H / 2 = 38` per UI-SPEC §8 `Spouse edge`.

**Vitest unit tests to produce (test file co-located or `tests/`):**
1. Spouse edge deduped via sorted-pair key — 2 people with symmetric `spouseIds` yields exactly 1 spouse edge.
2. Child with 2 parents yields 2 parent edges (D-13 — no couple-midpoint synthesis).
3. Isolated person (no relations) yields zero edges.
4. Missing counterpart IDs handled gracefully (no throw — the render-layer filters `undefined` lookups per `app.jsx` L401-403).

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/store/tree-store.ts` (EXTEND)

**Analog:** self — Phase 1 already set up the factory, `temporal()` wrapper, provider, and selector hook. Phase 2 extends the `TreeState` interface and initial state.

**Current Phase 1 shape** (`lib/store/tree-store.ts` L1-49):
```typescript
'use client';
import { createContext, createElement, useContext, useRef, type ReactNode } from 'react';
import { createStore, useStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';

export interface TreeState {
  treeId: string | null;
  selectedPersonId: string | null;
  transform: { x: number; y: number; k: number };
}

export function createTreeStore() {
  return createStore<TreeState>()(
    temporal(
      immer((_set) => ({
        treeId: null,
        selectedPersonId: null,
        transform: { x: 0, y: 0, k: 1 },
      })),
      { limit: 50 },
    ),
  );
}
```

**Phase 2 extensions** (D-09, D-10, D-11, D-12, UI-SPEC Reconciliation row 4):
```typescript
import type { Database } from '@/lib/supabase/types';
type PersonRow = Database['public']['Tables']['people']['Row'];
// Camel-case mirror used client-side:
export type Person = {
  id: string; name: string;
  gender: 'm' | 'f' | 'x' | 'u';
  pronouns: string | null;
  birthYear: number | null; deathYear: number | null;
  birthPlace: string | null; notes: string | null;
  spouseIds: string[]; parentIds: string[]; childIds: string[];
  x: number; y: number;
  isMe: boolean;
};

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface TreeState {
  // existing Phase 1 fields:
  treeId: string | null;
  selectedPersonId: string | null;
  transform: { x: number; y: number; k: number };

  // NEW Phase 2:
  people: Record<string, Person>;                    // D-09 Record-by-id for O(1) patches
  sidePanelOpen: boolean;                            // PANEL-01/03/09
  draggingPersonId: string | null;                   // D-10 drag-in-progress marker
  dragOrigin: { x: number; y: number } | null;       // D-10 revert target on Escape
  saveStateByPersonId: Record<string, SaveState>;    // D-11 — useSaveQueue writes here

  // Setters (body filled via immer):
  hydratePeople: (rows: PersonRow[]) => void;        // RSC → store seed on mount
  setPersonField: <K extends keyof Person>(id: string, field: K, value: Person[K]) => void;
  setPersonPosition: (id: string, x: number, y: number) => void;
  removePersonFromStore: (id: string) => void;
  setSelectedPersonId: (id: string | null) => void;
  setSidePanelOpen: (open: boolean) => void;
  setDragging: (id: string | null, origin?: { x: number; y: number } | null) => void;
  setTransform: (t: { x: number; y: number; k: number }) => void;
  setSaveState: (id: string, state: SaveState) => void;
}
```

**Selector pattern (D-10 — per-person selectors avoid cascade re-renders):**
```typescript
// In component:
const person = useTreeStore(s => s.people[personId]);
// NOT: const people = useTreeStore(s => s.people); // would re-render all nodes on every drag move
```

**Memoized array selector for edges + node iteration (D-09):**
```typescript
// Option A: derive with useMemo over Object.values(people) at EdgeLayer
const peopleArray = useTreeStore(s => s.people);
const edges = useMemo(() => computeEdges(Object.values(peopleArray)), [peopleArray]);

// Option B: selector with zustand-shallow or createSelector — only if profiling shows perf hit
```

**`temporal()` — DO NOT register drag/edit in Phase 2 (D-06).** Store wrapper is already in place from Phase 1; drag/edit commit directly to Server Action without invoking `temporal.getState().pastStates.push(...)`. Phase 3 wires this.

**No-JSX constraint** — keep `React.createElement` for the Provider (L40) so the file stays `.ts` (not `.tsx`).

**No module-scoped `createTreeStore()` call** — rule from Phase 1 Pitfall #6.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/globals.css` (EXTEND)

**Analog:** self (Phase 1) — extends the existing `@theme` block at L23-55.

**Current `:root` + `@theme` pattern** (`app/globals.css` L4-72):
```css
:root {
  --bg:           oklch(0.985 0.003 80);
  --bg-soft:      oklch(0.965 0.004 80);
  --bg-card:      oklch(1 0 0);
  --ink:          oklch(0.18 0.008 80);
  --ink-2:        oklch(0.38 0.006 80);
  --ink-3:        oklch(0.62 0.006 80);
  --rule:         oklch(0.88 0.005 80);
  --rule-soft:    oklch(0.93 0.004 80);
  --accent:       oklch(0.52 0.14 250);
  --accent-soft:  oklch(0.94 0.03 250);
  --success:      oklch(0.62 0.13 150);
  --danger:       oklch(0.55 0.17 25);
  --warning:      oklch(0.72 0.14 75);
  --grid-size:    24px;
}

@theme {
  --color-bg: var(--bg);
  /* ... */
}

.grid-bg {
  background-image:
    linear-gradient(to right, var(--rule-soft) 1px, transparent 1px),
    linear-gradient(to bottom, var(--rule-soft) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
}
```

**Phase 2 additions** (UI-SPEC §Color, D-08 grid move):
```css
/* Inside :root — gender accents + save-state softs */
:root {
  /* ...existing... */

  /* Gender stripe palette — 4px left edge on PersonNode */
  --gender-m:     oklch(0.68 0.1 250);
  --gender-f:     oklch(0.70 0.12 0);
  --gender-x:     oklch(0.68 0.1 120);
  --gender-u:     var(--rule);

  /* Save-state soft fills (pair with --success / --danger borders+text) */
  --save-saved-bg:  oklch(0.92 0.08 150);
  --save-error-bg:  oklch(0.92 0.08 25);
}

/* Inside @theme — expose Phase 2 vars as Tailwind tokens */
@theme {
  /* ...existing... */
  --color-gender-m: var(--gender-m);
  --color-gender-f: var(--gender-f);
  --color-gender-x: var(--gender-x);
  --color-gender-u: var(--gender-u);
  --color-save-saved-bg: var(--save-saved-bg);
  --color-save-error-bg: var(--save-error-bg);
}
```

**Grid utility** — already defined at L67-72; no change. The `<GridBackground>` component is deleted per D-08; the `.grid-bg` class moves to the inner transform wrapper in `<TreeCanvas>` (so dots pan+scale with the world per UI-SPEC Reconciliation row 2).

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/TreeCanvas.tsx` (new — canvas orchestrator)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/app.jsx` L17-136 + L380-449 (full `<App>` component state + canvas render).

**`'use client'` + Zustand selector pattern** (follow `components/shell/TreeTitle.tsx` L1-6):
```typescript
'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useTreeStore } from '@/lib/store/tree-store';
// ...
```

**Canvas-wrap + canvas-inner structure** (handoff `app.jsx` L380-391):
```jsx
<div
  ref={canvasRef}
  className={`canvas-wrap grid-bg ${panning ? 'panning' : ''}`}
  style={{top: 52}}
  onMouseDown={onCanvasMouseDown}
  onWheel={onWheel}
>
  <div
    className="canvas-inner"
    style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}
  >
    {/* edges + nodes */}
  </div>
</div>
```

**Phase 2 adaptations:**
- `canvas-wrap` → plain Tailwind div: `className={cn('absolute inset-0 overflow-hidden cursor-grab grid-bg', panning && 'cursor-grabbing')}` with `style={{ top: 52 }}`. (Handoff CSS classes not imported — Tailwind v4 + inline styles per Phase 1 convention.)
- `canvas-inner` → plain Tailwind div: `className="absolute top-0 left-0 will-change-transform"` + `style={{ transformOrigin: '0 0', transform: ... }}`.
- Move `.grid-bg` onto `.canvas-inner` (NOT `.canvas-wrap`) so grid pans/scales with world (D-08 / UI-SPEC row 2).
- `onMouseDown` must check `e.target.closest` to skip clicks on nodes / side panel / topbar (handoff L96-102).

**Empty-tree overlay render** — keep `<EmptyTreeOverlay />` when `Object.keys(people).length <= 1` (UI-SPEC §Empty states — "Phase 2 keeps the overlay visible until `people.length >= 2`").

**Data flow (D-09, D-10):**
1. Receive `{ tree, people }` as props from RSC.
2. On mount: `hydratePeople(people)` + `setTreeId(tree.id)` + `setTransform({ x: 400, y: 180, k: 1 })`.
3. Subscribe to `people`, `selectedPersonId`, `transform`, `sidePanelOpen`, `draggingPersonId` via narrow selectors.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/PanZoomWrapper.tsx` (new — optional extraction from TreeCanvas)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/app.jsx` L95-172 — port the exact handler bodies.

**Pan mousedown** (handoff L96-102):
```javascript
const onCanvasMouseDown = (e) => {
  if (e.target.closest('.node') || e.target.closest('.radial') || e.target.closest('.topbar') || e.target.closest('.toolbar')) return;
  setPanning(true);
  panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  setRadial(null);
  setSelectedId(null);
};
```

**Mousemove / mouseup** (handoff L104-137) — pan-OR-drag branches inside one window listener:
```javascript
React.useEffect(() => {
  const onMove = (e) => {
    if (panning && panStart.current) {
      setTransform(t => ({
        ...t,
        x: panStart.current.tx + (e.clientX - panStart.current.x),
        y: panStart.current.ty + (e.clientY - panStart.current.y),
      }));
    } else if (dragState.current) {
      const { id, startX, startY, origX, origY } = dragState.current;
      const dx = (e.clientX - startX) / transform.k;   // L114 — DIVIDE BY k (critical)
      const dy = (e.clientY - startY) / transform.k;
      setPeople(prev => prev.map(p => p.id === id ? { ...p, x: origX + dx, y: origY + dy } : p));
    }
  };
  const onUp = () => {
    if (dragState.current) {
      // Phase 2: call `movePerson(treeId, id, x, y)` Server Action here (UI-SPEC §4)
      dragState.current = null;
    }
    setPanning(false);
    panStart.current = null;
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  return () => { ... };
}, [panning, transform.k]);
```

**Wheel zoom (cursor-anchored)** (handoff L139-157):
```javascript
const onWheel = (e) => {
  if (!canvasRef.current) return;
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.002;  // Phase 2 OVERRIDE: 0.0015 per UI-SPEC §Canvas
    const newK = Math.max(0.3, Math.min(2.5, transform.k * (1 + delta)));  // Phase 2 OVERRIDE: [0.25, 4] per REQ CANV-06
    const kRatio = newK / transform.k;
    setTransform({
      k: newK,
      x: mx - (mx - transform.x) * kRatio,
      y: my - (my - transform.y) * kRatio,
    });
  } else {
    setTransform(t => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }));
  }
};
```

**Phase 2 tuning:**
- Wheel sensitivity `0.0015` (UI-SPEC §Canvas — NOT handoff `0.002`).
- Zoom clamp `[0.25, 4]` (REQ CANV-06 — NOT handoff `[0.3, 2.5]`).
- `addEventListener('wheel', handler, { passive: false })` is required so `e.preventDefault()` works (UI-SPEC §3) — in React, attach via a `useEffect` with manual `addEventListener` rather than JSX `onWheel` when `passive:false` is required.

**Drag threshold (UI-SPEC §4):** 3px from MouseDown start before entering `.dragging` visual state. The handoff doesn't implement this threshold — it enters dragging on first move. Add the threshold in Phase 2 so a bare click doesn't flash the drag shadow.

**Escape-during-drag (UI-SPEC §4 last row):** revert `people[id].x/y` to `dragOrigin` (captured on MouseDown → store via `setDragging(id, { x, y })`). The handoff has no Escape revert; this is Phase 2 new.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/EdgeLayer.tsx` (new — SVG overlay)

**Analog:** handoff `app.jsx` L327-337 (bbox memo) + L393-409 (render loop).

**Bbox memo** (app.jsx L327-337):
```javascript
const bbox = React.useMemo(() => {
  if (!people.length) return { minX: 0, minY: 0, w: 2000, h: 2000 };
  const xs = people.map(p => p.x);
  const ys = people.map(p => p.y);
  const minX = Math.min(...xs) - 400;
  const minY = Math.min(...ys) - 400;
  const maxX = Math.max(...xs) + NODE_W + 400;
  const maxY = Math.max(...ys) + NODE_H + 400;
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}, [people]);
```

**SVG render** (app.jsx L393-409):
```jsx
<svg
  className="edges"
  style={{ left: bbox.minX, top: bbox.minY }}
  width={bbox.w}
  height={bbox.h}
  viewBox={`${bbox.minX} ${bbox.minY} ${bbox.w} ${bbox.h}`}
>
  {edges.map((e, i) => {
    const a = people.find(p => p.id === e.a);
    const b = people.find(p => p.id === e.b);
    if (!a || !b) return null;
    if (e.kind === 'spouse') {
      return <path key={i} className="edge spouse" d={spousePath(a, b)}/>;
    }
    return <path key={i} className="edge parent" d={parentPath(a, b)}/>;
  })}
</svg>
```

**Handoff `.edges` CSS** (`styles.css` L221-234):
```css
.edges { position: absolute; top: 0; left: 0; pointer-events: none; overflow: visible; }
.edge { fill: none; stroke: var(--ink-2); stroke-width: 1.5; }
.edge.spouse { stroke: var(--accent); stroke-width: 2; }
.edge.parent { stroke: var(--ink); }
```

**Phase 2 adaptations:**
- Add `vector-effect="non-scaling-stroke"` to every `<path>` (REQ EDGE-05).
- Adapt to Tailwind+inline-style (project convention — no global CSS classes imported). Inline SVG stroke attributes: `<path stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" fill="none" />` for spouse; `stroke="var(--ink)" strokeWidth={1.5}` for parent.
- `<svg style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }} />` inline.
- Replace `people.find(...)` with `byId[e.a]` lookup (store holds `Record<id, Person>`, O(1)).
- Replace `peopleArray` from `Object.values(store.people)` — memoize.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/PersonNode.tsx` (new — 180×76 card)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/components.jsx` L5-72 (port + simplify to compact variant).

**Node JSX shape** (components.jsx L12-71):
```jsx
<div
  className={`node ${selected ? 'selected' : ''} ${person.isMe ? 'is-me' : ''}`}
  style={{ left: person.x, top: person.y, width: NODE_W }}
  onMouseDown={(e) => {
    if (e.button !== 0) return;
    onSelect(person.id);
    onStartDrag(e, person.id);
  }}
  onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(person.id); }}
>
  {/* Photo section — REMOVED in Phase 2 (compact 180×76) */}

  <div className="node-body">
    <div className="node-name">{person.name || 'Unnamed'}</div>
    <div className="node-years">
      {person.birthYear || '—'} &ndash; {person.deathYear || (person.birthYear ? '' : '—')}
    </div>
  </div>

  {selected && (
    <button
      className="node-add-btn"
      onClick={(e) => { e.stopPropagation(); onOpenRadial(person.id); }}
      style={{
        position: 'absolute',
        bottom: -14, left: '50%',
        transform: 'translateX(-50%)',
        width: 28, height: 28,
        background: 'var(--accent)',
        color: 'white',
        border: '1px solid var(--accent)',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '2px 2px 0 var(--ink)',
        zIndex: 3,
      }}
      title="Add relative"
    >
      <Plus size={14}/>
    </button>
  )}
</div>
```

**Handoff `.node` CSS** (`styles.css` L141-218):
```css
.node {
  position: absolute;
  width: 168px; /* Phase 2: 180px */
  background: var(--bg-card);
  border: 1px solid var(--ink);
  display: flex;
  flex-direction: column;
  cursor: grab;
  user-select: none;
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}
.node:hover { box-shadow: 4px 4px 0 var(--ink); }
.node.selected { box-shadow: 0 0 0 2px var(--accent), 4px 4px 0 var(--accent); }
.node.dragging { cursor: grabbing; box-shadow: 6px 6px 0 var(--ink); z-index: 100; }
.node.is-me { border-width: 2px; }
.node.is-me::before {
  content: 'YOU';
  position: absolute; top: -1px; right: -1px;
  background: var(--ink); color: var(--bg);
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em;
  padding: 2px 6px; z-index: 2;
}
```

**Reference current Phase-1 YOU ribbon** (`components/shell/SeedPersonNode.tsx` L22-29) — already adapts the handoff ribbon to Tailwind; reuse pattern:
```tsx
<span
  className="absolute -top-[1px] -right-[1px] z-[2] bg-ink font-mono text-[9px] tracking-[0.12em] text-bg-card"
  style={{ padding: '2px 6px' }}
>
  YOU
</span>
```

**Phase 2 additions:**
- **180×76 compact layout** (REQ NODE-01) — not handoff's 168×236 photo card.
- **Flex-row: 40px avatar + 4px gender stripe + text column** (UI-SPEC §Component Inventory, §Spacing).
- **Gender stripe** — absolute-positioned 4px-wide span on the left edge, full height, `background: var(--gender-{m|f|x|u})`.
- **`<AvatarCircle>` child** (new component, see below) at `w-[40px] h-[40px] rounded-full`.
- **Name + years in a right-column stack**:
  - Name: `text-[13px] font-semibold leading-[1.2] tracking-[-0.01em]` (UI-SPEC §Typography Label).
  - Years: `font-mono text-[11px] text-ink-2`. Formatting per UI-SPEC §Copywriting PersonNode table (`—`, `1981 – `, `1981 – 2019`, ` – 2019`).
- **Selection visual states** — apply via `aria-pressed`+Tailwind classes:
  ```tsx
  className={cn(
    'absolute flex bg-bg-card border cursor-grab select-none',
    'w-[180px] h-[76px]',
    selected ? 'border-[2px] border-accent' : 'border-[1px] border-ink',
    person.isMe && 'border-[2px] border-ink',
    dragging && 'cursor-grabbing z-[100]',
  )}
  style={{
    left: person.x, top: person.y,
    boxShadow: dragging
      ? '6px 6px 0 var(--ink)'
      : selected
      ? '0 0 0 2px var(--accent), 4px 4px 0 var(--accent)'
      : undefined,  // hover handled via CSS :hover
    transition: 'box-shadow 0.15s ease, transform 0.1s ease',
  }}
  ```
- **Hover shadow** — harder to do via pure Tailwind when the base shadow is conditional; options: (a) inline-style `onMouseEnter`/`onMouseLeave`, (b) a small utility class in `app/globals.css` (`.node-hover-shadow:hover { box-shadow: 4px 4px 0 var(--ink); }`), (c) Tailwind arbitrary `hover:shadow-[4px_4px_0_var(--ink)]`. Option (c) is cleanest.
- **`aria-pressed={selected}`** + `aria-label={"Open person details for " + person.name}` (UI-SPEC Accessibility).
- **`+` button on selected** — render button but wire `onClick` to a no-op with `console.info('[Phase 3] radial open for', person.id)` (UI-SPEC Open Q #12 decision).

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/AvatarCircle.tsx` (new — 40px avatar)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/Avatar.tsx`

**Reuse pattern** (`Avatar.tsx` L19-40):
```tsx
export default function Avatar({
  initials,
  size = 32,
  bgColor = 'oklch(0.62 0.006 80)',
  className,
  title,
}: AvatarProps) {
  return (
    <div
      title={title}
      className={cn(
        'grid place-items-center rounded-full text-[oklch(1_0_0)] font-mono font-semibold select-none',
        size === 32 ? 'h-[32px] w-[32px] text-[11px]' : 'h-[28px] w-[28px] text-[10px]',
        className,
      )}
      style={{ background: bgColor }}
      aria-label={title ?? `Avatar for ${initials}`}
    >
      {initials}
    </div>
  );
}
```

**Phase 2 adaptation:**
- Support `size=40` variant for PersonNode (UI-SPEC §Spacing `PersonNode avatar size` 40px). Font size at 40 should be 12-13px — pick via spot-check.
- Background color sourced from `hashUserIdToColor(person.id)` for now (reuse `lib/utils/hashUserId.ts` L16-23). When gender is known, palette is still hashed — gender is surfaced by the stripe, not the avatar fill (UI-SPEC §Color).
- `initialsFromName(person.name)` from `lib/utils/hashUserId.ts` L31-36 — same function Phase 1 uses.
- Empty-name fallback already covered by `initialsFromName` returning `??`; UI-SPEC §Copywriting PersonNode row says fallback is `?` — adjust the helper or let `??` stand (handoff uses `?` for empty in `model.jsx` L8). Planner's call — prefer helper-as-is for code reuse.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/SidePanel.tsx` (new — 380px right-dock)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/components.jsx` L128-251 (entire `SidePanel` component).

**Full handoff structure to adapt** (components.jsx L139-250):
```jsx
<div className="side-panel">
  <div className="side-panel-header">
    <div>
      <div className="side-panel-title" style={{display: 'flex', alignItems: 'center', gap: 8}}>
        <span>Person · {person.id.slice(0,6)}</span>
        {/* <SavePill /> extracted as separate component */}
      </div>
      <div style={{fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 4}}>
        {person.name || 'Unnamed'}
      </div>
    </div>
    <button className="btn btn-icon btn-ghost" onClick={onClose}><X/></button>
  </div>

  <div className="side-panel-content">
    <div className="side-panel-section">
      <label className="field-label">Full name</label>
      <input className="field-input" value={person.name} onChange={e => upd({name: e.target.value})}/>
    </div>

    {/* Gender section (components.jsx L185-197) */}
    <div className="side-panel-section">
      <label className="field-label">Gender</label>
      <div style={{display: 'flex', gap: 6}}>
        {[['m','Male'],['f','Female'],['x','Other']].map(([v,l]) => (
          <button
            key={v}
            className="btn btn-sm"
            style={person.gender === v ? {background:'var(--ink)', color:'var(--bg)', borderColor:'var(--ink)'} : {}}
            onClick={() => upd({gender: v})}
          >{l}</button>
        ))}
      </div>
    </div>

    {/* Born/Died grid (L174-183) */}
    <div className="side-panel-section" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 24, borderTop: '1px solid var(--rule-soft)'}}>
      <div>
        <label className="field-label">Born</label>
        <input className="field-input mono" placeholder="YYYY" value={person.birthYear || ''} onChange={e => upd({birthYear: e.target.value ? parseInt(e.target.value) : null})}/>
      </div>
      <div>
        <label className="field-label">Died</label>
        <input className="field-input mono" placeholder="YYYY" value={person.deathYear || ''} onChange={e => upd({deathYear: e.target.value ? parseInt(e.target.value) : null})}/>
      </div>
    </div>

    {/* Location, Notes, Relations, Actions — see components.jsx L199-234 */}

    <div style={{
      padding: '12px 0', marginTop: 12,
      borderTop: '1px solid var(--rule-soft)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div style={{fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em'}}>
        Changes save automatically
      </div>
      <button className="btn btn-primary btn-sm" onClick={onClose}>
        <Check size={13}/> Done
      </button>
    </div>
  </div>
</div>
```

**Handoff `.side-panel` CSS** (`styles.css` L367-405):
```css
.side-panel {
  position: absolute;
  top: 52px; right: 0; bottom: 0;
  width: 360px;  /* Phase 2: 380px */
  background: var(--bg-card);
  border-left: 1px solid var(--rule);
  z-index: 40;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease;
}
.side-panel-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--rule);
  display: flex;
  align-items: start;
  justify-content: space-between;
}
.side-panel-title {
  font-family: var(--mono);
  font-size: 10px;   /* Phase 2: 11px (UI-SPEC) */
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-3);
}
.side-panel-content { flex: 1; overflow-y: auto; padding: 20px 24px; }
.side-panel-section { margin-bottom: 24px; }
.side-panel-section + .side-panel-section {
  padding-top: 24px;
  border-top: 1px solid var(--rule-soft);
}
```

**Phase 2 adaptations:**
- **380px wide** (REQ PANEL-02), `top: 52px` (topbar), slide-in `transform: translateX(100%) → 0` over 200ms ease (UI-SPEC §6).
- **Pronouns field** (between Gender and Born) — UI-SPEC Copywriting "Side Panel — Identity" + D-05.
- **Field save path** — each `<FieldInput>` owns local `useState` (D-02), calls `enqueueField(personId, field, value)` from `useSaveQueue` on change. Store is updated at debounce-fire time only.
- **Unmount flush** — `useEffect(() => () => queue.flush(personId), [])` in the panel (UI-SPEC §7 rule 6, D-11).
- **`aria-live` + `role="status"`** on `<SavePill>` (UI-SPEC Accessibility).
- **Remove button** (PANEL-07, D-07) — `window.confirm('Remove {name} from the tree? This can't be undone.')` → `removePerson()` Server Action → `setSidePanelOpen(false) + setSelectedPersonId(null)`. Hidden for `person.isMe` (PANEL-08).
- **Escape handler** — add a `useEffect` registering `keydown` on window; close panel + deselect (UI-SPEC §5).

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/SavePill.tsx` (new — 5-state pill)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/components.jsx` L143-159.

**Handoff inline span pattern** (L143-159):
```jsx
<span style={{
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 6px',
  background: justSaved ? 'oklch(0.92 0.08 150)' : 'var(--bg-soft)',
  border: '1px solid ' + (justSaved ? 'var(--success)' : 'var(--rule)'),
  color: justSaved ? 'var(--success)' : 'var(--ink-3)',
  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em',
  transition: 'all 0.2s ease',
}}>
  <span style={{
    width: 6, height: 6, borderRadius: '50%',
    background: justSaved ? 'var(--success)' : 'var(--ink-3)',
  }}/>
  {justSaved ? 'Saved' : 'Auto-saves'}
</span>
```

**Phase 2 expansion** (UI-SPEC §7 Pill visual mapping — 5 states):

| State | Dot color | Text | Border | Bg |
|-------|-----------|------|--------|-----|
| `idle` | `--ink-3` | `Auto-saves` | `--rule` | `--bg-soft` |
| `dirty` | `--ink-3` | `Auto-saves` | `--rule` | `--bg-soft` |
| `saving` | `--ink-3` | `Saving…` | `--rule` | `--bg-soft` |
| `saved` | `--success` | `Saved` | `--success` | `--save-saved-bg` |
| `error` | `--danger` | `Couldn't save` (clickable) | `--danger` | `--save-error-bg` |

**Subscribe to store:**
```typescript
const saveState = useTreeStore(s => s.saveStateByPersonId[personId] ?? 'idle');
```

**Font size:** UI-SPEC locks 11px mono (not handoff's 9px). Use `font-mono text-[11px] tracking-[0.08em]`.

**A11y:** `role="status" aria-live="polite" aria-atomic="true"` wrapping the text per UI-SPEC Accessibility. Error state's click target is a button not a span (so it's keyboard-reachable) — `onClick={() => retry(personId)}`.

**Saving-dot animation (D-15):** NO animated pulse — static dot. UI-SPEC §7 pill visual table lists a pulse, but D-15 strictly locks "static dot + text"; follow D-15.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/SaveErrorToast.tsx` (new — ~80 LOC)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/styles.css` L544-560 (`.toast`) + handoff `app.jsx` L54-58 + L566 (`showToast` helper + render).

**Handoff `.toast` CSS** (L544-560):
```css
.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink);
  color: var(--bg);
  padding: 10px 16px;
  font-size: 13px;
  z-index: 200;
  box-shadow: 3px 3px 0 var(--accent);
  animation: toastIn 0.18s ease;
}
@keyframes toastIn {
  from { opacity: 0; transform: translate(-50%, 8px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
```

**Handoff `showToast` helper** (app.jsx L53-58):
```javascript
const showToast = (msg) => {
  setToast(msg);
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => setToast(null), 2200);
};
```

**Phase 2 adaptations** (D-16, UI-SPEC Copywriting Save Error States):
- **Scoped to save errors only** — a single React component that subscribes to the store's most recent error (`saveStateByPersonId` or a separate `lastSaveError: { personId, field, timestamp }` slice). D-16: do NOT install `react-hot-toast`.
- **Copy:** `Couldn't save {fieldLabel}` for field saves; `Couldn't save move for {name}` for drag failures (UI-SPEC Copywriting).
- **Auto-dismiss: 4.4s** (2× default — UI-SPEC: "4.4s (2× default because it's an error)"). Handoff uses 2.2s.
- **Retry button** on the right — calls `queue.retry(personId)`. Accent-colored (UI-SPEC Color).
- **`role="alert"`** (NOT `status`) since it's an error (UI-SPEC Accessibility). Retry is Tab-reachable.
- **Reduced-motion:** inherited from `app/globals.css` L81-86 — animation collapses to instant.

**Inline-style implementation (no global CSS needed):**
```tsx
<div
  role="alert"
  aria-live="assertive"
  className="fixed left-1/2 -translate-x-1/2 flex items-center gap-md bg-ink text-bg-card font-sans text-[13px]"
  style={{
    bottom: 80,
    padding: '10px 16px',
    zIndex: 200,
    boxShadow: '3px 3px 0 var(--accent)',
  }}
>
  <span>Couldn&apos;t save {fieldLabel}</span>
  <button onClick={onRetry} className="font-semibold text-accent hover:underline">
    Retry
  </button>
</div>
```

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/fields/FieldInput.tsx` (new)

**Analog:** `design_handoff_family_tree/source/components.jsx` L171 + handoff CSS `styles.css` L108-124 (`.field-label` + `.field-input`).

**Handoff** (components.jsx L170-171):
```jsx
<label className="field-label">Full name</label>
<input className="field-input" value={person.name} onChange={e => upd({name: e.target.value})}/>
```

**CSS** (styles.css L108-124):
```css
.field-label {
  font-family: var(--mono);
  font-size: 10px;   /* Phase 2: 11px (UI-SPEC) */
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-3);
  margin-bottom: 6px;
  display: block;
}
.field-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--rule);
  background: var(--bg-card);
  font-size: 14px;
}
.field-input:focus { border-color: var(--accent); }
```

**Phase 2 wrapper props:**
- `label: string` (mono 11px caps, `text-ink-3 tracking-[0.1em]`)
- `placeholder?: string`
- `value: string` (local-mirror from parent `useState`)
- `onLocalChange: (v: string) => void`
- `onDebouncedCommit: (v: string) => void` — fires via 400ms debounce, calls `useSaveQueue.enqueueField`
- `type?: 'text' | 'number' | 'mono'` — `mono` variant uses `font-mono`; `number` uses `inputMode="numeric"` + `pattern="[0-9]{0,4}"`.
- `aria-invalid` + `aria-describedby` wired to Zod error messages when validation fails locally.

**Inline-style implementation:**
```tsx
<div className="block">
  <label className="block font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3 mb-[6px]">
    {label}
  </label>
  <input
    className={cn(
      'w-full border border-rule bg-bg-card text-[14px] text-ink focus:border-accent focus:outline-none',
      type === 'mono' && 'font-mono',
    )}
    style={{ padding: '8px 10px' }}
    value={value}
    placeholder={placeholder}
    onChange={handleChange}
  />
</div>
```

**Reference existing pattern** — `components/shell/TreeTitle.tsx` L84-95 already uses this exact inline-style pair (`border-rule bg-bg-card text-[14px] focus:border-accent` + `padding: '8px 12px'`). Reuse and tweak padding to `8px 10px` per handoff.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/fields/FieldTextarea.tsx` (new)

**Analog:** handoff components.jsx L206-213:
```jsx
<textarea
  className="field-input"
  rows={4}
  style={{resize: 'vertical', fontFamily: 'inherit'}}
  placeholder="Stories, memories, a short bio…"
  value={person.notes || ''}
  onChange={e => upd({notes: e.target.value})}
/>
```

**Phase 2:** identical styling to FieldInput, but `<textarea rows={4} style={{ resize: 'vertical' }}>`. Same local-mirror + debounce pattern as FieldInput.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/fields/GenderSelect.tsx` (new — 3-button segmented)

**Analog:** handoff components.jsx L186-196:
```jsx
<div style={{display: 'flex', gap: 6}}>
  {[['m','Male'],['f','Female'],['x','Other']].map(([v,l]) => (
    <button
      key={v}
      className="btn btn-sm"
      style={person.gender === v ? {background:'var(--ink)', color:'var(--bg)', borderColor:'var(--ink)'} : {}}
      onClick={() => upd({gender: v})}
    >{l}</button>
  ))}
</div>
```

**Phase 2 adaptations:**
- Only 3 buttons exposed (`m`/`f`/`x`); `u` (unknown) is the default selection-less state when `gender === null || gender === 'u'`.
- Selected state: `bg-ink text-bg-card border-ink`.
- Unselected state: `bg-bg-card text-ink border-rule`.
- Click → immediately fire `onDebouncedCommit(value)` — no debounce needed for a discrete enum (gender is not typed-into).
- A11y: `role="radiogroup"` on wrapper, `role="radio" aria-checked={selected}` on each button.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/canvas/RelationsList.tsx` (new — read-only clickable names)

**Analog:** handoff components.jsx L216-223:
```jsx
<div style={{fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6, fontFamily: 'var(--mono)'}}>
  <div>Parents: {(person.parentIds || []).map(id => people.find(p => p.id === id)?.name).filter(Boolean).join(', ') || '—'}</div>
  <div>Spouses: {(person.spouseIds || []).map(id => people.find(p => p.id === id)?.name).filter(Boolean).join(', ') || '—'}</div>
  <div>Children: {people.filter(p => p.parentIds?.includes(person.id)).map(p => p.name).join(', ') || '—'}</div>
</div>
```

**Phase 2 adaptations (PANEL-06):**
- Each name becomes a clickable `<button>` span: `onClick={() => { setSelectedPersonId(id); animateRecenter(person); }}`.
- Hover state: `text-ink underline`.
- Separator: `·` (middot) per UI-SPEC Copywriting, NOT handoff's `, ` (comma-space). Apply per-list.
- Derive `parents`/`spouses` directly from `person.parentIds`/`person.spouseIds`. Derive `children` by scanning `peopleArray.filter(p => p.parentIds.includes(person.id))` (store holds `Record`, so convert once via `Object.values`).

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/(app)/tree/[treeId]/page.tsx` (EXTEND)

**Analog:** self (Phase 1).

**Current Phase 1 render** (`page.tsx` L56-88):
```tsx
return (
  <>
    <TopBar ... />
    <section
      aria-label="Family tree canvas"
      className="relative"
      style={{ minHeight: 'calc(100vh - 52px)' }}
      tabIndex={0}
    >
      <GridBackground />
      {seed && (
        <div className="absolute" style={{ left: '50%', top: 180, transform: 'translate(-50%, 0)' }}>
          <SeedPersonNode name={seed.name} x={0} y={0} />
        </div>
      )}
      {peopleList.length <= 1 && <EmptyTreeOverlay />}
    </section>
  </>
);
```

**Phase 2 replacement (UI-SPEC Reconciliation row 3):**
```tsx
return (
  <>
    <TopBar ... />
    <TreeCanvas tree={tree} people={peopleList} currentUserId={profile?.id} />
  </>
);
```

- Keep RSC as the authz boundary (`getUserIdOrThrow()` + RLS'd `supabase.from('trees')` + `from('people')`).
- Widen the `select()` to include **all** Phase 2 columns (people.ts L47-52 Phase 1 only selects `id, name, x, y, is_me`):
  ```typescript
  const { data: people, error: peopleErr } = await supabase
    .from('people')
    .select('id, name, gender, pronouns, birth_year, death_year, birth_place, notes, spouse_ids, parent_ids, child_ids, x, y, is_me')
    .eq('tree_id', treeId);
  ```
- Remove imports of `GridBackground` and `SeedPersonNode` (files deleted per D-08).
- Add import of `TreeCanvas` from `@/components/canvas/TreeCanvas`.
- `<EmptyTreeOverlay>` moves INSIDE `<TreeCanvas>` (since visibility is tied to `people.length` which lives in the store). Keep the component file — don't delete `EmptyTreeOverlay.tsx`.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/supabase/migrations/0002_add_pronouns.sql` (new — LIKELY NO-OP)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/supabase/migrations/20260421000000_initial_schema.sql` L42-73 (people table DDL + constraints).

**Reality check:** The initial migration L48 already defines `pronouns text`. The Phase 2 plan can either:

**Option A (recommended) — delete the migration task:**
- Skip the migration file entirely.
- Remove the `[BLOCKING] supabase db push` step.
- Skip the `supabase gen types typescript` step — `lib/supabase/types.ts` already includes `pronouns` at L102, L121, L141.
- Update CONTEXT.md / PROJECT.md to note pronouns was added in Phase 1 by accident / foresight.

**Option B — ship an idempotent no-op migration** (if the planner wants a paper trail):
```sql
-- supabase/migrations/0002_add_pronouns.sql
-- Phase 2: ensures pronouns column exists. No-op on clean installs because
-- the initial migration already defines it.
begin;
alter table public.people add column if not exists pronouns text;
commit;
```
Then still run `supabase db push` (no-op) and `supabase gen types typescript` (no-op).

Planner MUST ask the user which path to take before writing the plan.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/.planning/REQUIREMENTS.md` (docs edit)

**Source of edits:** D-08 locked list. Three mechanical changes:
1. CANV-01: `56px topbar` → `52px topbar`.
2. CANV-02: `8px spacing, --ink-4 at 10% opacity` → `24px spacing, --rule-soft`.
3. DATA-01: append `pronouns text` to the `people` column list.

Use Edit tool — small targeted string replacements.

---

### File: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/.planning/PROJECT.md` (docs edit)

**Source of edits:** D-08 — add a Key Decisions table row documenting pronouns shipped in P2 (or clarifying it was already shipped in the initial schema). Use Edit tool.

---

## Shared Patterns

### 1. Server Action Template

**Source:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/actions/trees.ts`

**Apply to:** every function in `app/actions/people.ts` (`updatePerson`, `movePerson`, `removePerson`).

```typescript
'use server';

import { getUserIdOrThrow } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export async function <fnName>(<args>): Promise<<Return>> {
  await getUserIdOrThrow();                        // defense-in-depth
  // (optionally: validate input with Zod here)
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from(<table>).<op>(...).eq(...);
  if (error) throw new Error(`<fnName> failed: ${error.message}`);
  return <data>;
}
```

### 2. Zustand Selector Per Component

**Source:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/store/tree-store.ts` L43-49 + `components/shell/TreeTitle.tsx` (provider-consumption).

**Apply to:** every canvas client component. Scope each selector to the narrowest possible slice to avoid re-render cascades (critical during drag per D-10).

```typescript
// PersonNode:
const person = useTreeStore(s => s.people[personId]);   // one row only
const selected = useTreeStore(s => s.selectedPersonId === personId);
const dragging = useTreeStore(s => s.draggingPersonId === personId);

// TreeCanvas (needs iteration):
const peopleRecord = useTreeStore(s => s.people);
const peopleArray = useMemo(() => Object.values(peopleRecord), [peopleRecord]);

// SavePill:
const saveState = useTreeStore(s => s.saveStateByPersonId[personId] ?? 'idle');
```

### 3. Client Component + `'use client'` Convention

**Source:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/TreeTitle.tsx` L1, `TreeSwitcher.tsx` L1, `UserMenu.tsx` L1.

**Apply to:** every file in `components/canvas/**` and `lib/hooks/**`.

```typescript
'use client';
import { ... } from 'react';
// ...
```

### 4. Tailwind Utility + Inline Style for Handoff Pixel Values

**Source:** the entire `components/shell/` directory — Phase 1 established this pattern because Tailwind v4's `@theme` tokens cover colors/spacing in the 4px scale but not handoff-specific one-offs like `boxShadow: '4px 4px 0 var(--ink)'`, `padding: '2px 6px'`, `top: 52`, etc.

**Examples:**
- Shadows: `style={{ boxShadow: '4px 4px 0 var(--ink)' }}` or Tailwind arbitrary `hover:shadow-[4px_4px_0_var(--ink)]`.
- Fixed-pixel paddings not on 4px scale: `style={{ padding: '20px 24px 16px' }}`.
- CSS vars: `style={{ background: 'var(--accent)' }}` — prefer Tailwind tokens (`bg-accent`) when available.

### 5. `cn()` ClassName Joiner

**Source:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/utils/cn.ts` — `clsx + tailwind-merge`.

**Apply to:** any component composing conditional classes (selected/dragging/hover/is-me on PersonNode, etc.).

### 6. `initialsFromName` + `hashUserIdToColor`

**Source:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/utils/hashUserId.ts` L16-23 + L31-36.

**Apply to:** `<AvatarCircle>`. Same two-function API the Phase 1 `<UserMenu>` already consumes.

### 7. Inline-Style Auth/Flash Behavior Override vs Global CSS

**Source:** Phase 1 convention — `components/shell/GridBackground.tsx` (uses global `.grid-bg` class from `app/globals.css`) vs `components/shell/Avatar.tsx` (100% Tailwind + inline style, no class reference).

**Decision rule for Phase 2:** when a handoff utility maps cleanly to ONE Tailwind class or ONE CSS var, prefer that. When the pattern is widely reused (e.g. the grid), keep the global class in `app/globals.css`. When one-off (e.g. `.side-panel` header padding, `.node-body` internal layout), use inline styles.

**Explicit: do NOT port handoff `.node`, `.side-panel`, `.edge`, `.field-input`, etc. as global CSS classes.** Phase 1 already established the "no handoff class names in global CSS" convention; Phase 2 continues it. The only global CSS utilities are `.grid-bg` (already present) + `*:focus-visible` + `@media prefers-reduced-motion`.

### 8. RSC → Client Component Data Handoff

**Source:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/(app)/tree/[treeId]/page.tsx` (Phase 1).

**Pattern:** RSC reads data under RLS via `supabaseServer()`, renders `<AuthError variant="rls-reject" />` on null, otherwise passes the server-fetched array to a client component as props. Client component `hydratePeople(props.people)` into the Zustand store on mount; subsequent mutations go through Server Actions.

```tsx
// In RSC (page.tsx):
const { data: people } = await supabase.from('people').select(...).eq('tree_id', treeId);
if (!tree) return <AuthError variant="rls-reject" />;
return <TreeCanvas tree={tree} people={people ?? []} />;

// In client:
'use client';
useEffect(() => { hydratePeople(props.people); setTreeId(props.tree.id); }, []);
```

### 9. Escape-Key + Outside-Click Close Pattern

**Source:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/TreeSwitcher.tsx` L36-56 + `UserMenu.tsx` L30-48.

**Apply to:** `<SidePanel>` Escape-close (UI-SPEC §5). Handoff app.jsx L82-93 has the global-Escape handler for the canvas as a whole.

```typescript
useEffect(() => {
  if (!open) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); /* focus restoration */ }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [open]);
```

### 10. Vitest Test File Location

**Source:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/tests/rls.spec.ts` L1-4 (imports + describe-pattern), `vitest.config.ts` L9 (include glob `**/*.{test,spec}.{ts,tsx}`).

**Apply to:** new `lib/graph/edges.test.ts` + any other unit tests. Co-locate next to source files; vitest discovers via the config glob.

```typescript
import { describe, it, expect } from 'vitest';
import { computeEdges } from './edges';

describe('computeEdges', () => {
  it('deduplicates reciprocal spouse edges', () => {
    const people = [
      { id: 'a', spouseIds: ['b'], parentIds: [], childIds: [] },
      { id: 'b', spouseIds: ['a'], parentIds: [], childIds: [] },
    ];
    const edges = computeEdges(people as any);
    expect(edges.filter(e => e.kind === 'spouse')).toHaveLength(1);
  });
});
```

---

## No Analog Found

Files with no close match in the existing codebase (planner should use handoff source + UI-SPEC + RESEARCH-style reasoning instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/hooks/useSaveQueue.ts` | custom hook + async queue | event-driven | No existing custom-hook directory or async-queue pattern in the codebase. Closest mental model is `useTransition` in TreeTitle, but the serial-merge-queue behavior is new. Build from UI-SPEC §7 state machine + D-03/D-11/D-14 rules. |
| `lib/schemas/person.ts` | Zod schema | static | No existing `lib/schemas/` directory. Zod and @hookform/resolvers are installed (package.json L26-28, L22, L34) but unused so far. Shape derives from `lib/supabase/types.ts` L128-146 DB Update type. |

Both files have clear specifications in CONTEXT.md (D-03, D-04, D-11, D-14) and UI-SPEC (§7) — the absence of an in-codebase analog is not a blocker.

---

## Metadata

**Analog search scope:**
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/**`
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/**`
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/**`
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/supabase/migrations/**`
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/**`
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/tests/**`

**Files scanned (full read):** 19
- `app/actions/trees.ts`
- `app/actions/bootstrap.ts`
- `app/(app)/layout.tsx`
- `app/(app)/tree/[treeId]/page.tsx`
- `app/globals.css`
- `lib/auth.ts`
- `lib/store/tree-store.ts`
- `lib/supabase/server.ts`
- `lib/supabase/browser.ts`
- `lib/supabase/types.ts`
- `lib/utils/cn.ts`
- `lib/utils/hashUserId.ts`
- `components/shell/Avatar.tsx`, `AuthError.tsx`, `EmptyTreeOverlay.tsx`, `GridBackground.tsx`, `SeedPersonNode.tsx`, `TopBar.tsx`, `TreeSwitcher.tsx`, `TreeTitle.tsx`, `UserMenu.tsx`
- `supabase/migrations/20260421000000_initial_schema.sql`
- `design_handoff_family_tree/source/model.jsx`
- `design_handoff_family_tree/source/components.jsx`
- `design_handoff_family_tree/source/app.jsx`
- `design_handoff_family_tree/source/styles.css`
- `tests/rls.spec.ts`, `vitest.config.ts`, `package.json`
- `.planning/phases/01-foundation/01-PATTERNS.md` (format reference)
- `.planning/phases/02-canvas-nodes-edit/02-CONTEXT.md`
- `.planning/phases/02-canvas-nodes-edit/02-UI-SPEC.md`

**Pattern extraction date:** 2026-04-21
