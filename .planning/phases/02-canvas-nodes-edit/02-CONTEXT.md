# Phase 2: Canvas, Nodes & Edit - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the **read + edit** half of the canvas:

1. Render an existing tree's people as 180×76 PersonNode cards positioned at stored `x,y` on a pan/zoom canvas with a dot grid background.
2. Draw spouse + parent–child edges as a derived single SVG overlay (no edges stored).
3. Click to select, drag to reposition, double-click / Enter to open a 380px right-docked side panel.
4. Edit Name / gender / pronouns / life fields; **the auto-save pill flips green only after server ACK** and red on save failure with a Retry toast.
5. Pixel-parity with `design_handoff_family_tree/source/styles.css`.

**OUT of scope (Phase 3 onward — do not build in P2):**
- Radial add-relative menu (Phase 3 — RAD-01..03, ADD-01..04)
- Undo/redo wiring of drag + edit mutations (Phase 3 — HIST-01..05). Phase 2 commits to server only; the temporal wrapper exists in the store but is not engaged for drag/edit yet.
- Bottom toolbar pill (Phase 3 — TOOL-01..02)
- General toast infrastructure (Phase 3 — TOAST-01). Phase 2 hand-rolls **only** the save-error toast.
- ⌘K search palette (Phase 3 — SRCH-01..02)
- Tidy / dagre couple-merge layout (Phase 4 — TIDY-01..05). Edge couple-midpoint routing is delivered as a side-effect of the Phase 4 dagre pass — Phase 2 ships simple per-parent edges.
- Share modal, presence, live cursors, broadcast (Phase 5)

</domain>

<decisions>
## Implementation Decisions

### A. Save & Mutation Pipeline

- **D-01:** All Phase 2 mutations are **Next.js Server Actions** in `app/actions/people.ts` (new file). Pattern mirrors Phase 1's `app/actions/trees.ts`: `'use server'` directive, `await getUserIdOrThrow()`, `await supabaseServer()`, RLS enforces authz. Keeps the mutation channel consistent with Phase 1; defers the direct-Supabase-from-client choice to Phase 5 where Realtime broadcast forces it.
- **D-02:** Optimistic-update pattern is **field-local `useState` mirror + commit on debounce-fire**. Each `<FieldInput>` / `<FieldTextarea>` / `<GenderSelect>` owns a local `useState` for the in-progress value. The Zustand store is updated only when the debounce fires (same moment the Server Action is invoked). This keeps the canvas from re-rendering on every keystroke and avoids selector cascades. The pill state goes `idle → dirty (internal only, no visible change) → saving → saved | error` per UI-SPEC §7.
- **D-03:** The per-person serial save queue (SAVE-04) lives in a custom hook **`lib/hooks/useSaveQueue.ts`**. The hook owns the in-flight Promise + pending-payload merge logic. It writes pill-state transitions to a thin Zustand slice (`saveStateByPersonId: Record<PersonId, 'idle'|'saving'|'saved'|'error'>`) that `<SavePill>` subscribes to. Layering: queue mechanics in hook, render-relevant state in store. Hook is unit-testable in isolation.
- **D-04:** Validation contract is a **shared Zod schema** in `lib/schemas/person.ts`. One `PersonPatchSchema` is consumed by (1) the Server Action input validation, (2) the React Hook Form resolver via `@hookform/resolvers` (already in `package.json`), and (3) typed against `Database['public']['Tables']['people']['Update']` from `lib/supabase/types.ts`. Endorsed by PROJECT.md Tech Stack §Forms.

### B. Phase Scope — Ship vs Defer

- **D-05:** **Ship pronouns column in Phase 2** via a mini-migration. Add `supabase/migrations/0002_add_pronouns.sql` with `ALTER TABLE people ADD COLUMN pronouns text NULL;`. Regenerate `lib/supabase/types.ts`. PANEL-04 ships in full. The plan must include a `[BLOCKING]` schema-push task (`supabase db push`) immediately after the migration file is created, before any code that depends on the new column.
- **D-06:** **Strict P2/P3 boundary on history.** Phase 2 mutations call the Server Action only — they do NOT yet wrap calls in zundo's `temporal` API. The store's `temporal()` wrapper from Phase 1 stays in place but is not engaged for `setPersonField` / `setPersonPosition`. Phase 3 (HIST-01..05) wires the same mutations into history. **Why:** keeps Phase 2 focused on save trustworthiness; avoids the trap where a failed save still appears in undo history.
- **D-07:** **Ship Remove-person in Phase 2 with `window.confirm()`**. Side panel Remove button calls `confirm('Remove {name} from the tree? This can't be undone.')`. On OK, invoke `removePerson(treeId, personId)` Server Action, then close the panel and deselect. Phase 3's PANEL-07 styled modal is a visual-only upgrade — the delete pipeline is built in P2. Hidden for `is_me` rows per PANEL-08.
- **D-08:** **Delete Phase 1 leftover components and fix REQUIREMENTS.md typos** as a small grooming task in the first plan:
  - Delete `components/shell/SeedPersonNode.tsx` — `<PersonNode>` handles the `is_me` variant.
  - Delete `components/shell/GridBackground.tsx` — grid moves to a CSS background utility on `.canvas-inner` (24px, `--rule-soft`, world-anchored).
  - Edit `.planning/REQUIREMENTS.md`:
    - CANV-01: "56px topbar" → "52px topbar" (matches Phase 1 + handoff).
    - CANV-02: "8px spacing, --ink-4 at 10% opacity" → "24px spacing, --rule-soft" (handoff source of truth; --ink-4 doesn't exist in token system).
    - DATA-01: append `pronouns text` to the `people` column list.
  - Edit `.planning/PROJECT.md`: add a Key Decisions row capturing the pronouns column decision.

### C. Store Shape & State Ownership

- **D-09:** **`people` is `Record<PersonId, Person>` in the store**, with a memoized `peopleArray` selector for callers that need to iterate (`computeEdges`, the node renderer). O(1) field patches by id support the SAVE-04 patch flow without find-and-splice. Extends `lib/store/tree-store.ts` `TreeState` with `people: Record<string, Person>` and adds setters: `hydratePeople`, `setPersonField`, `setPersonPosition`, `removePerson`.
- **D-10:** **Drag-in-progress state lives in the store.** Add `draggingPersonId: string | null` and `dragOrigin: {x: number, y: number} | null`. Mousemove during drag patches `people[id].x` and `people[id].y` directly so the SVG edge layer reactively follows the dragged node (one source of truth for position). Selectors are scoped to one personId so drag mousemove doesn't trigger cascade re-renders. Edges use a selector that depends on `peopleArray` — they re-derive each frame during drag, but a single SVG `<path>` array swap is well within the EDGE-06 60fps budget for 200 nodes.
- **D-11:** **Save state machine lives in `useSaveQueue`** (per D-03), with a thin `saveStateByPersonId: Record<string, SaveState>` slice in the store for `<SavePill>` rendering. `useSaveQueue` is the only writer to that slice. UI-SPEC rule 6 ("on panel close with dirty fields, immediately flush") is satisfied because the hook's state and Promises live across panel mount/unmount when the queue is held by a longer-lived component (the panel calls `queue.flush()` in its unmount cleanup).
- **D-12:** **Transform (`x,y,k`) stays ephemeral.** No DB column, no localStorage. Reset to `{x:400, y:180, k:1}` on reload (matches UI-SPEC + Phase 1). The transform already lives in the store from Phase 1; Phase 2 just wires the pan/zoom event handlers to `setTransform`.

### D. Edge Geometry & Save UX Timing

- **D-13:** **Phase 2 ships simple per-parent edges.** `computeEdges(peopleArray)` is a verbatim port of the handoff `model.jsx` L45-62 logic into `lib/graph/edges.ts` — yields one edge per `(parent → child)` pair. When both parents are horizontally adjacent, two near-identical strokes overlap (acceptable trade-off). Phase 4's dagre couple-merge pass naturally produces midpoint routing because couples become synthetic single nodes — at that point `computeEdges` may be rewritten or supplemented. **Do NOT synthesize couple-midpoint geometry in `computeEdges` for Phase 2.**
- **D-14:** **Auto-save debounce: 400ms.** Per-field debounce timer; when any timer fires, all dirty fields for that person batch into one Server Action call. This is the middle of the SAVE-01 "~250–500ms" band and matches the typical CRM/Linear feel.
- **D-15:** **SavePill `saving` state is a static dot + `Saving…` text** — no animated pulse. Strict handoff parity. Reduced-motion users get the same experience.
- **D-16:** **Phase 2 hand-rolls a single `<SaveErrorToast>` component** (`components/canvas/SaveErrorToast.tsx`, ~80 LOC). Scoped to save errors only — handoff `.toast` styling, bottom-center anchor, 4.4s auto-dismiss, dark `--ink` fill, white text, `Retry` button on the right. Phase 3 (TOAST-01) introduces full toast infrastructure for "Added parent / Tidied layout / Centered on…" messages — at that point the Phase 2 toast becomes one consumer of the shared infra. Do NOT add `react-hot-toast` as a dependency in Phase 2.

### Claude's Discretion

- **`<TreeCanvas>` component decomposition.** The split between `<TreeCanvas>` (root client component), `<PanZoomWrapper>` (wheel + drag listeners), `<EdgeLayer>` (SVG), and the node layer is left to the planner. UI-SPEC §Component Inventory provides recommended boundaries; planner can adjust.
- **Edge SVG bounding box.** UI-SPEC suggests min/max of `people[]` extents + 400px padding. Planner can tune the padding constant or use a fixed large viewBox if profiling shows recompute cost is non-trivial.
- **Wheel-zoom sensitivity constant.** UI-SPEC proposes `0.0015`; handoff uses `0.002`. Either is acceptable. Tune empirically during QA.
- **Drag movement threshold.** UI-SPEC says 3px before entering drag mode. Planner can adjust.
- **Specific lucide-react import pattern.** Tree-shaken named imports (`import { X, User, Trash2, Check, Plus } from 'lucide-react'`) — exact icon ordering and where the imports live is planner's call.
- **Plan count.** Planner determines how many `*-PLAN.md` files this phase becomes. Coarse granularity (per ROADMAP.md). A natural split is (1) canvas + nodes + edges + grooming, (2) selection + drag + side panel + save pipeline. Planner may merge or split further.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Source of Truth (pixel-parity is non-negotiable per DESIGN-01..03)

- `design_handoff_family_tree/source/styles.css` — handoff `:root` CSS variables; the Tailwind v4 `@theme` block must continue to map these 1:1 (Phase 1 already established this in `app/globals.css`).
- `design_handoff_family_tree/source/components.jsx` — handoff React component reference (Node L1-72, SidePanel L128-251, save pill inline at L1412-1425, toast at L544-560).
- `design_handoff_family_tree/source/model.jsx` — handoff `computeEdges`, `parentPath`, `spousePath`, edge math. **Port `computeEdges` L45-62 verbatim into `lib/graph/edges.ts`.**
- `design_handoff_family_tree/source/App.jsx` — handoff App component L1845-2348 with full pan/zoom/drag/wheel handler implementations. Reference for cursor-anchored zoom math L1976-1981 and drag delta scaling L1942-1943.
- `design_handoff_family_tree/README.md` — handoff usage notes.

### Phase Specification

- `.planning/phases/02-canvas-nodes-edit/02-UI-SPEC.md` — visual + interaction contract; resolves 15 open questions (this CONTEXT.md addresses any not already locked there).
- `.planning/REQUIREMENTS.md` — REQ-IDs CANV-01..06, NODE-01..06, EDGE-01..06, SEL-01..03, PANEL-01..09, SAVE-01..04, ERR-01, DESIGN-01..02 (with the corrections in D-08).
- `.planning/ROADMAP.md` §Phase 2 — goal, success criteria, requirement mapping.
- `.planning/PROJECT.md` — tech stack (Next 16 / React 19 / Clerk 7 / Supabase / Tailwind v4 / Zustand+zundo+immer / Server Actions), out-of-scope list, key decisions table.

### Phase 1 Carryover (extend, do not duplicate)

- `lib/store/tree-store.ts` — Zustand store factory + `TreeStoreProvider`; already wraps with `temporal()`. Phase 2 extends `TreeState` with `people`, `sidePanelOpen`, `draggingPersonId`, `dragOrigin`, `saveStateByPersonId`. Do NOT call `createTreeStore()` at module scope.
- `app/actions/trees.ts` — Server Action pattern (`'use server'`, `getUserIdOrThrow`, `supabaseServer`). Phase 2 mirrors this in `app/actions/people.ts`.
- `lib/supabase/server.ts` + `lib/supabase/browser.ts` + `lib/supabase/types.ts` — Supabase client factories + generated DB types. Regenerate `types.ts` after the pronouns migration.
- `lib/auth.ts` — `getUserIdOrThrow` / `getUserIdOrNull` (Clerk userId extraction).
- `lib/utils/cn.ts` + `lib/utils/hashUserId.ts` — `cn()` className joiner; `initialsFromName()` for avatar text.
- `app/(app)/tree/[treeId]/page.tsx` — Phase 1 RSC that fetches `tree` + `people` under RLS. Phase 2 extends this to pass `people[]` down to the new `<TreeCanvas>` client component while keeping the RSC as the authz boundary.
- `app/(app)/layout.tsx` — auth gate (redirect to `/sign-in` if not authenticated).
- `components/shell/TopBar.tsx` + sub-components — 52px topbar (locked height; do not change).
- `.planning/phases/01-foundation/01-04-SUMMARY.md` — Phase 1 plan 4 summary; documents the components and tree-route plumbing Phase 2 builds on.
- `.planning/phases/01-foundation/01-04-PLAN.md` — Phase 1's tree route + topbar plan; reference for the RSC pattern.
- `.planning/phases/01-foundation/01-RESEARCH.md` — RLS deep-dive, store factory rationale.
- `.planning/phases/01-foundation/01-PATTERNS.md` — codebase pattern map.
- `.planning/STATE.md` — current project state.

### Project + Tooling Conventions

- `CLAUDE.md` — project instructions (tech stack constraints, GSD workflow enforcement, conventions).
- `package.json` — installed deps (React Hook Form 7.73.1, @hookform/resolvers 5.2.2, zod 4.3.6, immer 11.1.4, zundo 2.3.0, lucide-react 1.8.0, nanoid 5.1.9 already present).
- `supabase/migrations/` — directory for the new `0002_add_pronouns.sql` migration.
- `vitest.config.ts` + `playwright.config.ts` — test runners (Vitest unit for `computeEdges` etc., Playwright E2E deferred to Phase 5).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phase 1)

- **`lib/store/tree-store.ts`** — Zustand store factory + Provider + `useTreeStore` selector hook + `temporal()` wrapper. Extend `TreeState` interface; do not create a second store.
- **`app/actions/trees.ts`** — Server Action template (`'use server'`, auth check, `supabaseServer()`, RLS-trusted Supabase call, error wrap). Copy this pattern for `app/actions/people.ts`.
- **`lib/supabase/server.ts`** — `supabaseServer()` factory (cookie-aware, Clerk JWT injected). All Server Actions use this.
- **`lib/supabase/browser.ts`** — `supabaseBrowser()` factory. Phase 2 uses for the RSC-hydrated initial fetch only; mutations go through Server Actions.
- **`lib/auth.ts`** — `getUserIdOrThrow()` / `getUserIdOrNull()`. Use in every Server Action.
- **`lib/utils/cn.ts`** — `cn()` className joiner (clsx + tailwind-merge). Use everywhere class composition is needed.
- **`lib/utils/hashUserId.ts`** — `initialsFromName(name)` + 4-OKLCH hashing palette. `<AvatarCircle>` should reuse `initialsFromName`.
- **`components/shell/Avatar.tsx`** — sole `rounded-full` consumer in `components/shell/`; reference for the `<AvatarCircle>` styling on PersonNode.
- **`app/globals.css`** — Tailwind v4 `@theme` block with handoff CSS variables. Phase 2 adds `--gender-m`, `--gender-f`, `--gender-x`, `--gender-u` and the save-state soft-bg colors here.

### Established Patterns

- **Server Action mutation pattern** (`app/actions/trees.ts`): `'use server'`, `await getUserIdOrThrow()` for auth defense-in-depth, `await supabaseServer()` for the RLS-bound client, throw on error with prefixed message. **Phase 2 mirrors this for `updatePerson`, `removePerson`, `movePerson`.**
- **RSC fetches data + passes to client component** (`app/(app)/tree/[treeId]/page.tsx`): RSC reads `tree + people` under RLS via `supabaseServer()`, renders `<AuthError variant="rls-reject" />` on null tree, otherwise hands `people[]` to a client component. Phase 2 keeps this exact pattern, replacing the inline empty-overlay rendering with `<TreeCanvas tree={...} people={...} />`.
- **Store factory + Provider** (`lib/store/tree-store.ts`): never module-scoped; one store per `<TreeStoreProvider>` instance via `useRef`. Selectors are individual functions passed to `useTreeStore(s => s.x)`. Phase 2 follows the same pattern for new selectors and never imports a global store.
- **Tailwind v4 with handoff tokens** (`app/globals.css`): all colors come from CSS variables in the `@theme` block; never hard-code OKLCH values in components. Phase 2's gender-stripe colors and save-state soft-bg additions go in `@theme`.
- **No JSX in `.ts` files** — `lib/store/tree-store.ts` uses `React.createElement` to keep its `.ts` extension. Phase 2 components live in `.tsx` files; plumbing in `.ts`.
- **Inline error fallbacks via `<AuthError>`** — RSCs return `<AuthError variant="..." />` on auth/RLS failures rather than throwing. Phase 2 follows this for the `<TreeCanvas>` data path.

### Integration Points

- **`app/(app)/tree/[treeId]/page.tsx` line that currently renders `<EmptyTreeOverlay />` + `<SeedPersonNode />`** — replace with `<TreeCanvas tree={tree} people={people} />`. The empty overlay still renders inside `<TreeCanvas>` when `people.length <= 1`.
- **`app/globals.css` `@theme` block** — extend with Phase 2's gender + save-state tokens.
- **`lib/store/tree-store.ts` `TreeState` interface and `createTreeStore()` initial state** — extend with the Phase 2 fields.
- **`lib/supabase/types.ts` `Database['public']['Tables']['people']`** — regenerate after the pronouns migration to include the new column.
- **The `temporal()` wrapper in the store** — present, but Phase 2 actions do NOT register past states for drag/edit yet (D-06). Phase 3 wires this.

### Constraints From Existing Code

- **Topbar height is 52px** — `components/shell/TopBar.tsx` is locked. Side panel `top: 52px`.
- **Server Actions cannot read cookies inside `useEffect`** — keep the auth check inside the action body itself, not in a wrapper.
- **`Database` generic type** — Phase 1 uses `supabaseServer<Database>()` etc. Phase 2 must regenerate the type after the pronouns migration before any code references `pronouns`.

</code_context>

<specifics>
## Specific Ideas

- **`computeEdges` port:** lift the handoff `model.jsx` L45-62 verbatim into `lib/graph/edges.ts`. Sorted-pair dedupe key for spouses. Vitest unit tests cover: spouse dedupe, child-of-couple yields two edges, isolated person yields zero edges. (TEST-01 partial coverage in P2.)
- **Save Pill copy table:** `idle` → `Auto-saves`; `dirty` → `Auto-saves` (no visible change); `saving` → `Saving…`; `saved` → `Saved` (1.4s); `error` → `Couldn't save` (clickable Retry). All mono 11px, 0.08em tracking. Color tokens per UI-SPEC §Color.
- **Save error toast copy:** `Couldn't save {fieldLabel}` for field saves; `Couldn't save move for {name}` for drag failures. 4.4s dismiss. Dark `--ink` bg, white text, accent Retry button.
- **Confirm dialog copy:** `Remove {name} from the tree? This can't be undone.` Native `window.confirm()`. Hidden for `is_me`.
- **PersonNode component constants** (UI-SPEC §Spacing): 180×76 card, 40px avatar, 4px gender stripe, 1px / 2px borders, hover `4px 4px 0 var(--ink)`, selected `0 0 0 2px var(--accent), 4px 4px 0 var(--accent)`, dragging `6px 6px 0 var(--ink)`, is-me `YOU` ribbon `2px 6px` padding mono 9px.
- **Side panel constants** (UI-SPEC §Spacing): 380px wide, `top: 52px`, full viewport height, `z-index: 40`, slide `transform 0.2s ease`, header padding `20px 24px 16px`, content padding `20px 24px`, section margin-bottom 24px.
- **Pan/zoom math** (UI-SPEC §Interaction Contract): cursor-anchored zoom `kRatio = newK / oldK; x' = mx - (mx - x) * kRatio`; drag delta `(clientX - startX) / transform.k`; clamp `[0.25, 4]`; wheel sensitivity `0.0015`.
- **Field debounce + batch:** per-field timer fires after 400ms idle; all dirty fields for the same person batch into one Server Action call; serial queue prevents overlapping requests per person; on panel close, flush pending immediately.
- **Edge geometry** (UI-SPEC §EDGE): spouse `M (a.x+NODE_W) (a.y+NODE_H/2) L b.x (b.y+NODE_H/2)` 2px `--accent`; parent–child orthogonal `M px,py L px,mid L cx,mid L cx,cy` 1.5px `--ink`; `vector-effect="non-scaling-stroke"`; single SVG with `overflow:visible`.
- **Pronouns migration:** `supabase/migrations/0002_add_pronouns.sql` content: `ALTER TABLE public.people ADD COLUMN pronouns text NULL;`. Regen types via `supabase gen types typescript --project-id {projectId} > lib/supabase/types.ts`.

</specifics>

<deferred>
## Deferred Ideas

(Tracked so they aren't lost — none of these belong in Phase 2.)

- **Bbox-aware fit-to-content** — Phase 3 adds the toolbar Fit button which can compute people-extent bbox; Phase 2's Fit-to-view resets to `{x:400, y:180, k:1}` only.
- **Per-node Tab traversal / arrow-key navigation** — out of scope per PROJECT.md (v2 only); Phase 2 has canvas-as-a-whole single-tabIndex.
- **Couple-midpoint edge synthesis in `computeEdges`** — deferred to Phase 4 dagre pass (D-13).
- **Drag throttling for Realtime broadcast** — Phase 5 RT-06 (~30Hz throttle on a separate broadcast channel; persistence stays drag-end only).
- **Drag/edit zundo wiring** — Phase 3 HIST-05 (D-06).
- **Styled `<ConfirmDialog>` component** — Phase 3 PANEL-07 visual upgrade; Phase 2 uses native `window.confirm()` (D-07).
- **`react-hot-toast` dependency** — Phase 3 TOAST-01 evaluates (D-16); Phase 2 hand-rolls.
- **localStorage / DB transform persistence** — out of v1 scope (D-12).
- **Saving-dot pulse animation** — UI-SPEC alternative; not shipped (D-15).
- **Per-keystroke optimistic store updates** — rejected in favor of field-local mirror (D-02).
- **Direct-Supabase-from-client mutations** — Phase 5 evaluates (Realtime forces this for broadcast); Phase 2 uses Server Actions (D-01).

</deferred>

---

*Phase: 02-canvas-nodes-edit*
*Context gathered: 2026-04-21*
