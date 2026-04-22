# Phase 2: Canvas, Nodes & Edit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 02-canvas-nodes-edit
**Areas discussed:** Save & mutation pipeline, Phase scope (ship vs defer), Store shape & state ownership, Edge geometry & save UX timing

---

## Save & Mutation Pipeline

### Where do mutations live? (updatePerson for field edits + drag persistence)

| Option | Description | Selected |
|--------|-------------|----------|
| Server Actions | Pattern Phase 1 already established (app/actions/trees.ts). Type-safe, server-side Zod validation, supabaseServer() with RLS, easy to test. Slight latency cost. | ✓ |
| Direct Supabase from client | supabaseBrowser() with Clerk-injected JWT. Lower latency. Also the channel Phase 5 needs for Realtime broadcast. Validation client-side + DB CHECK. | |
| Mixed: reads via Supabase client, writes via Server Actions | Hybrid — RSC + supabaseServer() for reads; Server Actions for writes; supabaseBrowser() reserved for Phase 5 Realtime. | |

**User's choice:** Server Actions
**Notes:** Consistent with Phase 1 pipeline; Phase 5 will introduce supabaseBrowser() for Realtime broadcast separately.

### When does the user's typed value flow into local state?

| Option | Description | Selected |
|--------|-------------|----------|
| Field-local useState mirror + commit on debounce-fire | Each FieldInput owns useState; store updates on debounce. Matches UI-SPEC hint. Avoids canvas re-render per keystroke. | ✓ |
| Immediate write to Zustand on every keystroke | Single source of truth. Risk: jank during fast typing — every keystroke triggers selector reruns. | |
| React Hook Form + Zod resolver (one form per panel) | RHF owns field state via uncontrolled refs. Adds a layer; worth it for shared Zod schema. | |

**User's choice:** Field-local useState mirror + commit on debounce-fire
**Notes:** RHF + shared Zod schema chosen separately for validation (Q4); the field state itself is local useState, not RHF-controlled.

### Where does the per-person serial save queue live? (SAVE-04)

| Option | Description | Selected |
|--------|-------------|----------|
| In a custom hook (useSaveQueue) | Hook owns in-flight Promise + pending-payload merge. Keeps store lean. Easy to unit test. | ✓ |
| In the Zustand store as a typed action | store.savePersonField handles serial queueing. Pro: queue survives panel unmount. Con: store balloons. | |
| Inline in SidePanel via useEffect + useRef | Simplest; queue lifetime tied to panel mount. Risk: orphaned save toasts. | |

**User's choice:** Custom hook (useSaveQueue) with thin store slice for pill render-state
**Notes:** Hook is single writer to store.saveStateByPersonId; layering keeps queue mechanics testable in isolation.

### Validation contract — where do field rules live?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared Zod schema | One PersonPatchSchema in lib/schemas/person.ts. Used by Server Action + RHF resolver + Database type alignment. | ✓ |
| Server Action validates only, client trusts user input | Simpler client; validation errors surface only after debounce. | |
| DB CHECK constraints + minimal client coercion | Lean: Postgres CHECK + coercion helper. No Zod runtime cost. | |

**User's choice:** Shared Zod schema
**Notes:** PROJECT.md tech stack endorses RHF + Zod 4.3.6 + @hookform/resolvers 5.2.2 — all already in package.json.

---

## Phase Scope — Ship vs Defer

### Pronouns field — PANEL-04 lists it but DATA-01 schema has no pronouns column

| Option | Description | Selected |
|--------|-------------|----------|
| Add `pronouns text` migration in Phase 2 | Mini-migration: 0002_add_pronouns.sql + regen Database types. PANEL-04 ships in full. | ✓ |
| Drop pronouns from Phase 2 side panel — add later | Skip for now. PANEL-04 ships partial. | |
| Add the column now, hide the field until later | Schema ready; UI ships when rest of form does. | |

**User's choice:** Add migration in Phase 2
**Notes:** Adds one [BLOCKING] schema-push task to the plan; supabase/migrations/0002_add_pronouns.sql; regen lib/supabase/types.ts.

### Drag + field-edit history (zundo) — wire in Phase 2 or strict Phase 3 boundary?

| Option | Description | Selected |
|--------|-------------|----------|
| Strict boundary: P2 server-only, P3 wires zundo | UI-SPEC default. Phase 2 mutations call Server Action; no temporal history. Phase 3 wraps mutations in temporal calls. | ✓ |
| Pre-wire zundo in Phase 2 for drag + edit | Doing it once is cheaper. ~30 LOC. Risk: history captures save failures. | |

**User's choice:** Strict P2/P3 boundary
**Notes:** Avoids the failed-save-in-history trap; keeps Phase 2 focused on save trustworthiness.

### Remove-person action (PANEL-07) — ship in Phase 2 or fully defer to Phase 3?

| Option | Description | Selected |
|--------|-------------|----------|
| Ship with native window.confirm() in P2 | UI-SPEC default. Native confirm + Server Action delete. Phase 3 swaps in styled modal as visual-only upgrade. | ✓ |
| Defer entirely to Phase 3 | Phase 2 ships PANEL-07 disabled or omitted. Cleaner phase boundary. | |
| Ship with a tiny inline modal in P2 | Build 80-LOC ConfirmDialog primitive; reuse later. | |

**User's choice:** Ship with native window.confirm()
**Notes:** Hidden for is_me per PANEL-08. Delete pipeline lives in P2; visual upgrade in P3.

### Phase 1 leftover components + REQUIREMENTS.md typos — cleanup approach?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete + correct: drop SeedPersonNode/GridBackground, fix REQUIREMENTS typos | <PersonNode> handles is-me. Grid moves to CSS. Fix CANV-01 56→52, CANV-02 8→24, DATA-01 add pronouns. | ✓ |
| Refactor in place: keep components, move them inside transform wrapper | Less file churn. Risk: SeedPersonNode 168 vs PersonNode 180 visual drift. | |
| Leave Phase 1 artifacts alone; build alongside | Risk: dead code, duplicate components. | |

**User's choice:** Delete + correct
**Notes:** Small grooming task in plan 1; updates REQUIREMENTS.md and PROJECT.md.

---

## Store Shape & State Ownership

### How is the people collection shaped in the Zustand store?

| Option | Description | Selected |
|--------|-------------|----------|
| Record<id, Person> + computed peopleArray selector | O(1) field patches by id. Best fit for SAVE-04 patch flow. | ✓ |
| Person[] (matches handoff prototype) | Find-and-splice for patches (immer makes this fine). Iteration-first. | |
| Both: Person[] as source, Record cached per render via useMemo | One concept; lookups stay O(1). Slight memo complexity. | |

**User's choice:** Record + memoized peopleArray selector
**Notes:** computeEdges consumes Object.values(people) via selector.

### Where does drag-in-progress state live?

| Option | Description | Selected |
|--------|-------------|----------|
| Zustand: draggingPersonId + setPersonPosition | Mousemove patches person.x/y in store. Edges reactively follow. One source of truth. | ✓ |
| Local useState in TreeCanvas (drag-overlay pattern) | Edges don't follow drag mid-flight. Breaks the "edges follow" UX. | |
| useRef + imperative DOM updates during drag | Fastest. Edges still don't follow. Power-user pattern; harder to test. | |

**User's choice:** Zustand store
**Notes:** Selectors scoped to one personId so cascade re-renders don't fire.

### Where does the save state machine live?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside useSaveQueue hook + thin Record<id, SaveState> in store for pill | Hook owns state machine + queue. SavePill subscribes to store slice. Clean layering. | ✓ |
| Fully in Zustand store (per-person Record) | store.saveStateByPersonId + store.savePersonField. Ties save mechanics to store API. | |
| Local useReducer in SidePanel only | Lost when panel closes. Doesn't satisfy UI-SPEC rule 6 (flush on close). | |

**User's choice:** useSaveQueue hook + thin store slice
**Notes:** Hook is sole writer to store.saveStateByPersonId.

### Pan/zoom transform persistence — ephemeral or per-tree?

| Option | Description | Selected |
|--------|-------------|----------|
| Ephemeral, reset to fitView on reload | UI-SPEC default. Matches Phase 1 + handoff. No DB column. | ✓ |
| Persist per tree to localStorage | User returns to where they left off. ~10 LOC. | |
| Persist per tree to DB (trees.viewport_x/y/k) | Carries across devices. Heavier; questionable v1 value. | |

**User's choice:** Ephemeral
**Notes:** Reset to {x:400, y:180, k:1} per UI-SPEC.

---

## Edge Geometry & Save UX Timing

### Couple parent-child edge routing (EDGE-04 'parent-pair midpoint')

| Option | Description | Selected |
|--------|-------------|----------|
| Simple per-parent edges in P2; P4 dagre adds midpoint | One edge per parent→child. P4's couple-merge dagre pass naturally produces midpoint routing. ~0 extra LOC in P2. | ✓ |
| Synthesize midpoint in P2 (~40 LOC in computeEdges) | Visually correct in P2. Throwaway code if P4 dagre rewrites computeEdges. | |
| Couple-aware: midpoint when same y, per-parent fallback otherwise | Best visual fidelity. Most code (~60 LOC). | |

**User's choice:** Simple per-parent edges in P2
**Notes:** Acceptable trade-off: two near-identical strokes overlap when couple is horizontally adjacent; P4 dagre fixes naturally.

### Auto-save debounce timing (SAVE-01 says '~250–500ms')

| Option | Description | Selected |
|--------|-------------|----------|
| 400ms | UI-SPEC default. Middle of REQ band. CRM/Linear feel. | ✓ |
| 300ms (snappier) | Pill flips to Saving… faster. More server load on long-form Notes. | |
| 500ms (kinder to slow connections) | Fewer redundant saves. Longer perceived "will it save?" window. | |

**User's choice:** 400ms

### SavePill 'Saving…' state — animated pulse on the dot or static?

| Option | Description | Selected |
|--------|-------------|----------|
| Static dot + 'Saving…' text | UI-SPEC alt. Strict handoff parity. Reduced-motion users get same experience. | ✓ |
| 1s pulse animation on the dot | UI-SPEC default. Subtle "I'm working" signal. ~5 lines CSS keyframes. | |

**User's choice:** Static dot + text

### Save error toast — use react-hot-toast or hand-roll for Phase 2?

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-roll inline <SaveErrorToast> for P2 | UI-SPEC default. ~80 LOC, scoped to save errors only. P3 introduces full toast infra. | ✓ |
| Add react-hot-toast 2.7.0 now | Install dep, wire <Toaster> into (app) layout. P3 skips toast-infra-build step. | |
| Skip toast entirely in P2 — red pill is enough | Matches handoff minimalism. Risk: failed Retry has no clear signal. | |

**User's choice:** Hand-roll inline component
**Notes:** P3 (TOAST-01) introduces full toast infrastructure; the P2 component becomes one consumer of shared infra at that point.

---

## Claude's Discretion

Areas explicitly left to the planner / implementer:

- `<TreeCanvas>` component decomposition (UI-SPEC §Component Inventory provides recommended boundaries; planner adjusts)
- Edge SVG bounding box recompute strategy
- Wheel-zoom sensitivity constant (UI-SPEC 0.0015 vs handoff 0.002)
- Drag movement threshold (UI-SPEC 3px)
- lucide-react import organization
- Plan count (planner determines from coarse granularity)

## Deferred Ideas

(Captured in CONTEXT.md `<deferred>` section.)

- Bbox-aware fit-to-content → Phase 3
- Per-node Tab / arrow-key nav → v2
- Couple-midpoint edge synthesis → Phase 4 dagre
- Drag broadcast throttling → Phase 5 RT-06
- Drag/edit zundo wiring → Phase 3 HIST-05
- Styled ConfirmDialog component → Phase 3 PANEL-07
- react-hot-toast dependency → Phase 3 TOAST-01
- localStorage / DB transform persistence → out of v1
- Saving-dot pulse animation → not shipped
- Direct-Supabase-from-client mutations → Phase 5
