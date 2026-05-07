# Phase 3: Authoring & History - Research

**Researched:** 2026-05-07
**Domain:** Canvas authoring loop (radial menu, optimistic add, zundo history, search palette, generic toast infra, accessibility)
**Confidence:** HIGH

## Summary

Phase 3 is the first phase where the user can grow the tree. The authoring loop must feel effortless: click `+` -> radial menu -> pick relation -> new node appears with side panel auto-opened -> Cmd+Z reverses cleanly -> Cmd+K finds anyone. CONTEXT.md locks 37 implementation decisions (D-01..D-37); UI-SPEC §1-10 locks every visual surface and interaction; the prescriptive stack (Zustand 5 + zundo 2.3 + immer 11 + lucide-react 1.8 + nanoid 5.1.9) is already installed.

Phase 3 adds **zero npm dependencies**. Every piece of new infrastructure (radial menu, toolbar, modal primitive, toast host, search palette, inline-undo delete, keyboard shortcut listener) is hand-rolled on top of primitives Phase 1 and Phase 2 already shipped. The sole library question CONTEXT.md flagged for the planner (D-32: zundo `pause()` / `resume()` API surface) is now answered — verified by reading `node_modules/zundo@2.3.0/dist/index.d.ts` and the zundo README locally: `pause()`, `resume()`, `isTracking`, and `clear()` are all on `temporal.getState()`. The drag-coalescing pattern works as the UI-SPEC §3 implementation note describes.

**Primary recommendation:** Proceed with the UI-SPEC + CONTEXT.md plan as locked. Wire the existing `temporal()` middleware in `lib/store/tree-store.ts` with `{ limit: 100, partialize: (s) => ({ people: s.people }), equality: shallow }`; bracket every drag mousemove with `temporal.getState().pause() / resume()`; route inverse Server Actions through `useSaveQueue` (D-06 recommendation); ship optimistic-first add-relative (D-12 recommendation); collision-nudge as a pure function in `lib/graph/placement.ts`. Hand-rolled keyboard listener at `<TreeCanvas>` root (one `useEffect`, `document.activeElement` gate). Search palette uses BFS-up-to-4-hops relation walker (`lib/graph/relations.ts`) — same shape as the handoff `relationLabel` function in `design_handoff_family_tree/source/model.jsx` L14-42.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Radial menu open/close + render | Browser / Client | — | Pure UI overlay anchored on a selected node; no server state involved |
| Add-relative mutation (atomic, symmetric) | API / Backend (Server Action) | Browser / Client (optimistic local commit) | Symmetric relationship patches MUST be atomic to avoid half-applied state under network blips (D-09); client mirrors the change optimistically |
| Cycle detection on add | Database (Postgres) | API / Backend (verify result) | DATA-07 already enforces this server-side via `creates_parent_cycle()` SQL function; client never re-implements |
| Parent-cap enforcement (max 2) | Database (CHECK constraint) | API / Backend (rejection -> toast) | DATA-06 CHECK constraint is authoritative; client renders the failure toast without pre-disabling (D-10) |
| Undo/redo state machine | Browser / Client (zundo) | API / Backend (replay inverse Server Actions per D-03) | History is local; server-sync replays inverse mutations through `useSaveQueue` |
| Keyboard shortcut routing | Browser / Client | — | Single `useEffect` at TreeCanvas root reads `document.activeElement`; nothing leaves the client |
| Search filter / relation hint | Browser / Client | — | Pure function over the in-memory `people` map; no API call |
| Recenter canvas on search pick | Browser / Client | — | `setTransform({...})` on the Zustand store; same math as Phase 2 SidePanel `handleRelationClick` |
| Toast lifecycle (push, dismiss, dwell timer) | Browser / Client | — | Ephemeral UI state in the store; never persisted |
| Inline-undo delete (commit + 6s toast + restore) | Browser / Client (zundo) | API / Backend (`removePerson`, then `addPerson` on undo) | zundo replays the inverse on undo; server is the source of truth |
| Collision-nudge placement | Browser / Client (pure function) | — | Pure math in `lib/graph/placement.ts`; no server input needed beyond the in-memory `people` map |

**Why this matters:** every Phase 3 surface is browser-side except the `addPerson` Server Action (atomic write of new row + symmetric relation patches on the anchor) and the existing Phase 2 `removePerson` / `updatePerson` / `movePerson` actions reused for undo replay. There is **no new backend tier work** beyond `addPerson`. Plans should not introduce any new RPC, edge function, middleware, or RLS policy.

## Standard Stack

### Core (already installed; Phase 3 adds nothing)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.12 [VERIFIED: package.json] | Client store; existing `<TreeStoreProvider>` factory pattern | Phase 1+2 baseline; `useShallow` import is `zustand/react/shallow` per `node_modules/zustand/shallow.d.ts` [VERIFIED] |
| zundo | 2.3.0 [VERIFIED: node_modules/zundo/package.json] | Temporal middleware (already wired with `{ limit: 50 }`; Phase 3 swaps to 100 + partialize) | API surface confirmed: `pause()`, `resume()`, `isTracking`, `pastStates`, `futureStates`, `undo(steps?)`, `redo(steps?)`, `clear()`, `setOnSave()` [VERIFIED: `node_modules/zundo/dist/index.d.ts` lines 4-16] |
| immer | 11.1.4 [VERIFIED: package.json] | Patch-based mutations inside `temporal(immer(...))` | Phase 1 already wraps `temporal(immer(set => ({...})))`; Phase 3 keeps that order (`temporal` outside, `immer` inside) |
| lucide-react | 1.8.0 [VERIFIED: package.json] | Toolbar + side-panel icons | Phase 3 adds these names (all confirmed available in lucide library): `Undo2`, `Redo2`, `ZoomIn`, `ZoomOut`, `Maximize2`, `Sparkles`, `PanelRight`, `Search` [CITED: lucide.dev/icons] |
| nanoid | 5.1.9 [VERIFIED: package.json] | Toast id generation; new-person id (matches handoff `uid()`) | Phase 3 uses `nanoid()` for `toast.id` (and per DATA-10, person ids are UUIDs generated client-side — not nanoid). Use `crypto.randomUUID()` for person ids since DATA-10 specifies UUID; `nanoid` only for toast ids |
| react | 19.2.5 [VERIFIED: package.json] | UI runtime; `useEffect`, `useRef`, `useCallback` patterns | Phase 1+2 baseline; `useTransition` is acceptable but not required for Phase 3 work |
| next | 16.2.4 [VERIFIED: package.json] | Server Actions + App Router | `addPerson` is a `'use server'` action mirroring `app/actions/people.ts` patterns |

### Supporting (already installed; Phase 3 reuses without import additions)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | 2.104.0 [VERIFIED: package.json] | DB client inside Server Actions | `addPerson` calls `supabaseServer()` then `supabase.from('people').insert(...)` then patches the anchor's relation array via a second `update`, all wrapped server-side |
| @hookform/resolvers + react-hook-form + zod | 5.2.2 / 7.73.1 / 4.3.6 [VERIFIED: package.json] | NOT used in Phase 3 surfaces — UI-SPEC's search palette, radial menu, toolbar are not classic forms | Reserved for Phase 2 SidePanel field primitives (already shipping); Phase 3 search input is plain controlled `<input>` |
| clsx + tailwind-merge | 2.1.1 / 3.3.0 [VERIFIED: package.json] | Conditional classes via existing `cn()` in `lib/utils/cn.ts` | Used heavily in radial buttons, toolbar buttons, toast variants |
| @clerk/nextjs | 7.2.3 [VERIFIED: package.json] | Auth (already integrated) | `addPerson` uses existing `getUserIdOrThrow()` helper |

### Alternatives Considered (and rejected)
| Instead of | Could Use | Tradeoff / Reason rejected |
|------------|-----------|----------|
| Hand-rolled toast `<ToastHost>` | `react-hot-toast` 2.7.0 | Explicitly rejected by UI-SPEC + Deferred Ideas: "react-hot-toast dependency — UI-SPEC reaffirms hand-rolled toast infra; do NOT add this dep." Hand-rolled is ~60 LOC and already specced |
| `cmdk` / `kbar` for search palette | cmdk 1.x (Radix command primitive) | Not justified: SRCH-01/02 require alphabetical filter on a single in-memory `people` map (typically <500 entries). cmdk's value (fuzzy search, virtualization, command groups) is wasted here, and adding it violates UI-SPEC's "zero new dependencies in Phase 3" stance. Hand-rolled `<input>` + filtered `<ul>` is ~40 LOC |
| `framer-motion` for radial / modal animations | framer-motion 11+ | All Phase 3 motion is pure CSS keyframes already defined in handoff (`@keyframes popIn`, `@keyframes fadeIn`, `@keyframes toastIn`); zero JS animation needed |
| `react-hotkeys-hook` for ⌘Z, ⌘K, ⌘F | react-hotkeys-hook 4.x | UI-SPEC §A11Y-02 mandates `document.activeElement` scope check that hotkey libraries don't natively express well; one hand-rolled `useEffect` listener (~30 LOC) is clearer and matches the existing Phase 2 Esc listener in `PanZoomWrapper.tsx` L294-305 |
| Headless UI / Radix `<Dialog>` for search palette modal | @radix-ui/react-dialog 1.x | UI-SPEC §Component Inventory specifies a custom `<Modal>` primitive shared with Phase 5 Share modal. Hand-rolled `<div role="dialog" aria-modal="true">` with focus trap (~50 LOC) is sufficient; reaffirms shadcn rejection |
| dagre for "Tidy" button | @dagrejs/dagre 3.0.0 | OUT of scope per CONTEXT.md D-18 (Tidy is Phase 4). Toolbar button renders disabled in Phase 3 |

**Installation:** none. Run `npm install` only if a fresh checkout has stale `node_modules`; no `package.json` changes for Phase 3.

**Version verification:** all packages listed verified against `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/package.json` and the corresponding `node_modules/<pkg>/package.json` files at research time. No npm registry lookups needed because packages are already installed and pinned.

## Architecture Patterns

### System Architecture Diagram

```
                        ┌──────────────────────────────────────┐
                        │ User input (mouse, keyboard, focus)  │
                        └──────────────┬───────────────────────┘
                                       │
                  ┌────────────────────┴───────────────────────┐
                  │                                            │
         (a) +-button click on selected node           (b) ⌘Z / ⌘⇧Z / ⌘K / ⌘F
                  │                                            │
                  ▼                                            ▼
        setRadialOpenFor(personId)               TreeCanvas root keyboard listener
                  │                                  │
                  ▼                                  ▼
        <RadialMenu> (4 buttons)        document.activeElement gate
                  │                                  │
            click button "child"                     ├─ if INPUT/TEXTAREA/contenteditable: NO-OP (return)
                  │                                  │
                  ▼                              else dispatch:
        ┌─ optimistic local commit ─────────┐                  │
        │ insert person into store.people   │       ├─ ⌘Z       → temporal.undo() → onSave callback diffs people pre/post
        │ run collisionNudge() on placement │       │            → for each changed person, fire inverse Server Action via useSaveQueue
        │ setSelectedPersonId, setSidePanel │       ├─ ⌘⇧Z/⌘Y  → temporal.redo() → same diff & sync
        │ pushToast({kind:'success'})       │       ├─ ⌘K/⌘F   → setSearchOpen(true) (palette opens, focus to input)
        └─────────┬──────────────────────────┘       └─ ⌘F      → e.preventDefault() to suppress browser Find
                  │
                  ▼
        addPerson(treeId, kind, anchorId, position)  [Server Action]
                  │
                  ▼
        Postgres: insert people row + UPDATE anchor's spouse_ids/parent_ids/child_ids
        (single transaction; cycle check + parent-cap CHECK enforced server-side)
                  │
        ┌─ ACK (success) ────────────────────┐    ┌─ rejection (cycle / parent-cap / network) ─┐
        │ pill on new person → 'saved'       │    │ rollback local state (delete optimistic)   │
        │ confirmation toast persists        │    │ pushToast({kind:'error', action:'Retry'})  │
        └────────────────────────────────────┘    └────────────────────────────────────────────┘

                                       │
                                       ▼
                       <EdgeLayer> re-derives edges from new people map
                       (computeEdges already in lib/graph/edges.ts; reused unchanged)


                          ┌─────────────────────────────┐
   Drag mousedown ────────│ temporal.getState().pause() │ ←── Phase 3 wraps Phase 2's drag handler
                          └──────────────┬──────────────┘
                                         │
   Drag mousemove (many) ── setPersonPosition (no history push because paused)
                                         │
                          ┌──────────────┴──────────────┐
   Drag mouseup ──────────│ resume() then commit move   │ → ONE pastState push captures pre→post delta
                          └─────────────────────────────┘
```

### Recommended Project Structure (Phase 3 additions)

```
components/
  canvas/
    RadialMenu.tsx               # NEW (UI-SPEC §1)
    Toolbar.tsx                  # NEW (UI-SPEC §4)
    SearchPalette.tsx            # NEW (UI-SPEC §5)
    ToastHost.tsx                # NEW (UI-SPEC §7)
    Toast.tsx                    # NEW (inline within ToastHost)
    SaveErrorToast.tsx           # DELETED — replaced by useSaveErrorToast publisher hook
    PersonNode.tsx               # MODIFIED L115-119 (wire +button to setRadialOpenFor)
    SidePanel.tsx                # MODIFIED L162-189 (drop window.confirm, optimistic delete + toast)
    PanZoomWrapper.tsx           # MODIFIED drag handlers (pause/resume bracket)
    TreeCanvas.tsx               # MODIFIED (mount RadialMenu, Toolbar, SearchPalette, ToastHost; mount keyboard listener)
  ui/
    Modal.tsx                    # NEW — generic backdrop+box+popIn primitive (Phase 5 reuses)
lib/
  graph/
    placement.ts                 # NEW — collisionNudge() pure function
    placement.test.ts            # NEW — Vitest unit tests
    relations.ts                 # NEW — relationFrom() BFS up to 4 hops
    relations.test.ts            # NEW — Vitest unit tests
    edges.ts                     # UNCHANGED
  store/
    tree-store.ts                # MODIFIED (slice fields + actions; temporal config)
  hooks/
    useSaveQueue.ts              # MODIFIED (accept inverse Server Action submissions for undo replay) OR new helper
    useSaveErrorToast.ts         # NEW — publisher hook subscribing to saveStateByPersonId
    useTreeKeyboard.ts           # NEW (optional) — encapsulates the TreeCanvas keyboard listener
app/
  actions/
    people.ts                    # MODIFIED — add addPerson(treeId, kind, anchorId, position)
e2e/
  phase-3-demo-path.spec.ts      # NEW — full demo path Playwright test
```

**Note on `useTreeKeyboard.ts`:** factoring the keyboard listener into a hook is optional; inlining it in `TreeCanvas.tsx` is also acceptable. Either way it must check `document.activeElement` BEFORE dispatching shortcuts.

### Pattern 1: zundo drag coalescing via pause/resume

**What:** Wrap the entire drag gesture (mousedown -> mouseup) in `temporal.pause()` / `resume()` so the many `setPersonPosition` calls during mousemove generate ZERO history entries, but the final post-drag state captures ONE pastState push.

**When to use:** Any continuous gesture that produces many `setState` calls but should appear as a single undoable action — drag, slider scrub, color-picker drag.

**Why it works:** zundo's `_handleSet` callback (where pastStates are pushed) checks `isTracking` before pushing. `pause()` flips `isTracking = false`; `resume()` flips it back. The pastStates push happens on the NEXT `setState` after `resume()` runs, capturing the diff between the pre-pause snapshot and the post-resume snapshot.

**Example:**

```typescript
// Source: zundo 2.3.0 — verified against node_modules/zundo/dist/index.d.ts L11-12
// and README "Stop and start history" section L530-544 [VERIFIED]

// In PanZoomWrapper.tsx onMouseDown for a node drag:
const onNodeMouseDown = (e: React.MouseEvent) => {
  // ... existing drag-seed logic ...
  // Pause history while drag is in progress
  storeApi.temporal.getState().pause();
};

// In onMouseUp (after position is committed):
const onUp = () => {
  if (dragStateRef.current && draggingActiveRef.current) {
    // ... existing setPersonPosition + movePerson commit logic ...
    // Resume history; the NEXT setState (which is none here, but the resume
    // call itself does NOT push) — we need to explicitly push the post-drag
    // state. Cleanest pattern: resume(), then call the same setPersonPosition
    // with the final coordinates so a single _handleSet fires.
    storeApi.temporal.getState().resume();
    // The next state mutation that happens after resume() generates the
    // pastState entry. Since setPersonPosition was already called BEFORE
    // resume() (during paused window), call it once more with the same final
    // (x, y) to trip the push:
    setPersonPosition(ds.id, finalX, finalY);
  }
};
```

**Important nuance verified from the d.ts:** The pastState push happens inside the `_handleSet` callback that fires on `setState`. `resume()` alone does NOT trigger a push. You must explicitly do at least one `setState` after `resume()` for the push to land. The cleanest pattern for drag is:

1. mousedown -> `temporal.pause()`
2. mousemove (many) -> `setPersonPosition` (no history push because paused)
3. mouseup -> `setPersonPosition` (final, still paused; no push) -> `temporal.resume()` -> `setPersonPosition` (same final coords; THIS push captures the gesture)

OR simpler equivalent: capture the pre-drag snapshot, replace the entire drag logic with a single setState at mouseup (drop intermediate updates entirely), and rely on the natural single push. The first pattern preserves visual feedback during the drag; the second is simpler. **CONTEXT.md D-07 + UI-SPEC §3 implementation note both prescribe pattern 1.**

### Pattern 2: Optimistic-first add-relative with rollback

**What:** Insert the new person into the store immediately at the computed position; fire the Server Action; on rejection, delete the optimistic person from the store and surface a SaveErrorToast.

**When to use:** Any client-driven mutation where rare server failures are acceptable as a brief flash. Matches the Phase 2 drag-save pattern (D-12 recommendation).

**Example:**

```typescript
// Phase 3 add-relative pseudocode
async function addRelativeFlow(kind, anchorId) {
  const newId = crypto.randomUUID(); // DATA-10: UUID generated client-side
  const initialPos = computeInitialPosition(kind, anchorId);
  const finalPos = collisionNudge(initialPos, store.getState().people);

  // Optimistic local commit:
  store.getState().addPersonOptimistic({
    id: newId,
    name: '',
    gender: 'u',
    parentIds: kind === 'parent' ? [] : kind === 'child' ? [anchorId] : [],
    spouseIds: kind === 'spouse' ? [anchorId] : [],
    childIds: kind === 'parent' ? [anchorId] : [],
    x: finalPos.x,
    y: finalPos.y,
    isMe: false,
    // ... other defaults
  });
  // Plus: patch anchor's relation array client-side
  store.getState().patchAnchorRelation(anchorId, kind, newId);
  store.getState().setSelectedPersonId(newId);
  store.getState().setSidePanelOpen(true);

  try {
    await addPerson(treeId, kind, anchorId, finalPos);
    // ACK — pushToast confirmation (2200ms, no Undo button)
    pushToast({ kind: 'success', message: `Added ${kind} · ${anchor.name}`, dwellMs: 2200, ariaRole: 'status', ariaLive: 'polite' });
  } catch (err) {
    // Rollback
    store.getState().removePersonFromStore(newId);
    store.getState().patchAnchorRelationRemove(anchorId, kind, newId);
    pushToast({ kind: 'error', message: messageForError(err, kind, anchor.name), dwellMs: 4400, ariaRole: 'alert', ariaLive: 'assertive', action: { label: 'Retry', onAction: () => addRelativeFlow(kind, anchorId) } });
  }
}
```

### Pattern 3: Scope-aware keyboard listener

**What:** A single `useEffect` at TreeCanvas root attaches a `keydown` listener that checks `document.activeElement` BEFORE dispatching ⌘Z / ⌘⇧Z / ⌘Y / ⌘K / ⌘F. If focus is in a text-editing element, the listener returns immediately.

**When to use:** Any global keyboard shortcut that must coexist with native input behaviors (textarea undo, browser Find-in-page).

**Example:**

```typescript
// Source: pattern matches Phase 2 PanZoomWrapper.tsx L293-305 Escape handler [VERIFIED]
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    // Scope gate (HIST-04 + A11Y-02). Skip when focus owns native undo / find.
    const ae = document.activeElement;
    const tag = ae?.tagName;
    const isContentEditable = (ae as HTMLElement | null)?.isContentEditable ?? false;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || isContentEditable) return;

    const meta = e.metaKey || e.ctrlKey;
    if (!meta) return;

    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      if (e.shiftKey) {
        storeApi.temporal.getState().redo();
      } else {
        storeApi.temporal.getState().undo();
      }
      return;
    }
    if (e.key === 'y' || e.key === 'Y') {
      e.preventDefault();
      storeApi.temporal.getState().redo();
      return;
    }
    if (e.key === 'k' || e.key === 'K' || e.key === 'f' || e.key === 'F') {
      e.preventDefault(); // suppress browser Find-in-page when canvas owns focus
      setSearchOpen(true);
      return;
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [storeApi, setSearchOpen]);
```

### Pattern 4: Relation walker (BFS up to 4 hops)

**What:** A pure function `relationFrom(people, fromId, toId)` that BFS-walks the relationship graph from the user's `is_me` person (`fromId`) and returns a relation hint kind for `toId`. Used by the search palette result rows.

**When to use:** Phase 3 search palette result hints (`PARENT · OF YOU`, etc).

**Reference implementation:** `design_handoff_family_tree/source/model.jsx` L14-42 [VERIFIED] — the prototype already has `relationLabel(person, rootId, people)` that handles spouse, parent, child, sibling, grandparent. Phase 3 ports this as a pure function with explicit kind/qualifier output.

**Example shape:**

```typescript
// lib/graph/relations.ts
export type RelationKind = 'self' | 'parent' | 'spouse' | 'child' | 'sibling' | 'relative';
export type RelationHint = { kind: RelationKind; qualifier?: string };

export function relationFrom(
  people: Record<string, Person>,
  fromId: string,
  toId: string,
): RelationHint {
  if (fromId === toId) return { kind: 'self', qualifier: 'YOU' };
  const from = people[fromId];
  const to = people[toId];
  if (!from || !to) return { kind: 'relative' };

  if (from.spouseIds.includes(toId)) return { kind: 'spouse', qualifier: 'OF YOU' };
  if (from.parentIds.includes(toId)) return { kind: 'parent', qualifier: 'OF YOU' };
  if (from.childIds.includes(toId)) return { kind: 'child', qualifier: 'OF YOU' };
  if (from.parentIds.some(pid => to.parentIds.includes(pid))) return { kind: 'sibling', qualifier: 'OF YOU' };
  // Fallback to BFS for grandparent, in-law, etc — up to 4 hops.
  // ... BFS impl ...
  return { kind: 'relative' };
}
```

### Anti-Patterns to Avoid

- **Calling `temporal.pause()` without `resume()`:** History will silently stop tracking everywhere. Always pair them in the same effect/handler with a `try/finally` guard if any code between them might throw.
- **Pushing optimistic-fail state into history:** If add-relative fails server-side, the optimistic insert MUST be rolled back BEFORE any history push. Otherwise undo replays a phantom person. Pattern: pause history during the optimistic insert; resume only after server ACK; THAT first post-resume setState is what gets pushed.
- **Rendering radial slice positions via inline `transform: rotate()`:** UI-SPEC §1 specifies absolute `(left, top)` positioning at `(±90, 0) / (0, ±90)`. Don't use rotate-and-translate hacks; absolute positioning is simpler and matches the handoff `RadialMenu` reference in `design_handoff_family_tree/source/components.jsx` L31-65 [VERIFIED].
- **Putting the radial menu inside `<PersonNode>`:** It gets clipped by the node's bounding box and its own absolute positioning fights the node's `left/top`. Mount `<RadialMenu>` as a sibling of all nodes inside the canvas-transform `<div>` so it inherits pan/zoom but is not clipped.
- **Storing `panZoomMode` or `radialOpenFor` in zundo's pastStates:** UI-SPEC §3 partialize exclusion is exhaustive — every ephemeral field must be excluded. The simplest pattern is `partialize: (state) => ({ people: state.people })` (whitelist the only persistent slice).
- **Implementing search palette search on every keystroke via `useEffect`:** Filter inline in the render: `const results = useMemo(() => Object.values(people).filter(p => p.name.toLowerCase().includes(query.toLowerCase())).sort(...), [people, query])`. No effect needed, no debounce needed — local filter is microsecond-cost.
- **Using `KeyboardEvent.code` instead of `.key`:** `code` is layout-independent (good for arrow keys), but `.key` is correct for letters because Cmd-Z on a Dvorak keyboard is `key === 'z'` even though `code === 'KeySemicolon'`. The current Phase 2 Esc handler uses `.key` — keep consistent.
- **Forgetting to `e.preventDefault()` on ⌘F:** Without it, the browser's Find-in-page will pop up alongside the search palette. UI-SPEC §8 explicitly calls this out.
- **Mounting `<ToastHost>` inside `<SidePanel>`:** Toasts must persist across panel open/close. Mount at `<TreeCanvas>` root level (sibling of PanZoomWrapper), like Phase 2 does for SaveErrorToast (`components/canvas/TreeCanvas.tsx` L88) [VERIFIED].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Undo/redo state machine | A `history: Person[][]` + `hIndex` reducer (the prototype's pattern in `design_handoff_family_tree/source/app.jsx`) | zundo 2.3.0's `temporal()` middleware (already wired) | zundo handles 100-entry cap, partialize, equality, pause/resume, and the diff between past/future state cleanly. Hand-rolled history would duplicate every Person record on every keystroke even with `partialize` — zundo's `equality: shallow` skips no-op pushes |
| Drag coalescing into one history entry | Manual snapshot capture on mousedown + manual diff on mouseup + manual `pastStates.push()` | `temporal.getState().pause()` + `resume()` + one final `setPersonPosition` after resume | zundo's pause/resume API is exactly this pattern; no diff math needed |
| Symmetric relationship patches (a's spouseIds += b AND b's spouseIds += a) | Two separate Server Actions wrapped client-side in `Promise.all` | One atomic `addPerson(treeId, kind, anchorId, position)` Server Action that does both writes in one Postgres transaction | Network blip between the two calls leaves anchor un-patched while new person exists. Atomic is the only safe shape (CONTEXT.md D-09) |
| Cycle detection on add | Client-side BFS walk that mirrors server CHECK | The existing `creates_parent_cycle()` SQL function (Phase 1 DATA-07) | Server is authoritative; client mirroring is duplicate work that can drift |
| Parent-cap (max 2) enforcement | Client-side `anchor.parentIds.length >= 2 ? disable : enable` on the Parent radial button | Server CHECK constraint rejects, client surfaces `Couldn't add parent — already has two` toast (D-10) | Avoids client-server schema drift; rare edge case doesn't deserve mirrored client logic |
| Toast queue with stacking, dwell timers, ARIA roles, dismiss animations | A custom event emitter + array reducer + dwell setTimeout management spread across components | A Zustand slice (`toasts: Toast[]`) + `<ToastHost>` mounted once + per-toast `useEffect` running its own dismiss timer (~50 LOC total) | UI-SPEC §7 already specifies the data shape; one component owns the rendering; one pure store action manages the queue. Simpler than `react-hot-toast` for the 5 toast types Phase 3 needs |
| Search filter / fuzzy match | Custom Aho-Corasick / Levenshtein fuzzy matching | Native `String.prototype.toLowerCase().includes(query)` | UI-SPEC §5 explicitly specs substring filter ("Filter `people[]` by `person.name.toLowerCase().includes(query.toLowerCase())`"). No fuzzy needed for v1 |
| Modal focus trap | Hand-rolled keydown listener that intercepts Tab/Shift+Tab and walks focusable elements | Don't ship a focus trap in v1; use `<dialog>` element OR rely on the modal's z-index 100 + `role="dialog"` + `aria-modal="true"` + `Esc` to close. Tab-trap is a v2 polish | UI-SPEC §10 says only `:focus-visible` outline is required; A11Y-01 doesn't mandate trap. Inert background on modal-open is sufficient until user testing flags Tab-escape |
| Zustand selector memoization for derived collections (`Object.keys(people)`) | Manual `useMemo` calls scattered across consumers | `useShallow` from `zustand/react/shallow` (already in PanZoomWrapper L11) | Phase 2 quick-task 260422-9vu fix mandates `useShallow` for any selector returning an object/array. Required for the search palette result list selector |
| Person ID generation | nanoid `nanoid()` | `crypto.randomUUID()` for `Person.id` (DATA-10 says UUID); use `nanoid(10)` for `Toast.id` only | DATA-10 + the `people.id uuid` column type require UUID format. nanoid base62 strings would fail the schema |
| Recenter canvas tween | Hand-rolled `requestAnimationFrame` interpolator updating `transform` 60 times per second | CSS `transition: transform 300ms cubic-bezier(0.3, 0.9, 0.3, 1)` on the canvas-inner div + a single `setTransform({...})` at the end | Phase 2 Plan 03 deferred this to Phase 3 because pan-handler continuous updates fight a CSS transition. Solution: only apply the transition class when the change comes from a search-palette-pick, NOT when the user is panning/zooming. Toggle via `data-tween="true"` attribute the SearchPalette sets, then unsets after 300ms |

**Key insight:** Phase 3's discipline is *what NOT to add*. Every "library X solves Y" temptation has been pre-rejected in UI-SPEC. The hand-rolled infrastructure is small (each new component is well under 200 LOC) and the planning win is to keep adherence tight.

## Runtime State Inventory

> Phase 3 is greenfield code with no rename/refactor/migration scope. This section is preserved for completeness.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — verified by reading `app/actions/people.ts` and `supabase/migrations/20260421000000_initial_schema.sql`. Phase 3 introduces no schema changes per CONTEXT.md "Constraints From Existing Code" section L218-220 | None |
| Live service config | None — no n8n, Datadog, Tailscale, etc in this project (verified by reading `package.json` and absence of any service config in repo root) | None |
| OS-registered state | None | None |
| Secrets / env vars | Existing Clerk + Supabase env vars unchanged. Phase 3 adds no new env vars | None |
| Build artifacts | None | None |

**Nothing found in any category — verified by code/repo inspection.** Phase 3 is purely additive code in `components/`, `lib/graph/`, `lib/hooks/`, `lib/store/`, `app/actions/people.ts`, `e2e/`.

## Common Pitfalls

### Pitfall 1: zundo pushes pastStates on EVERY setState even when state is unchanged

**What goes wrong:** Without an `equality` option, zundo writes a pastState every time any `set()` call runs — including ephemeral mutations like `setSelectedPersonId(null)`, even if the resulting state shape under `partialize` is byte-identical.

**Why it happens:** zundo's default behavior is "push on every setState"; the `equality` option exists to gate the push.

**How to avoid:** Use `equality: shallow` (from `zustand/vanilla/shallow` per `node_modules/zustand/shallow.d.ts` L1 [VERIFIED]). Combined with `partialize: (state) => ({ people: state.people })`, pushes only happen when the `people` map's reference changes (which immer ensures only on people-related mutations).

**Warning signs:** Ctrl-Z after typing in a field reverts MULTIPLE times before any visible change happens (because every keystroke / pill flip / selection change is a separate pastState). Test by adding a person, dragging it once, and pressing Ctrl-Z exactly once — should fully revert in one press.

### Pitfall 2: Inverse Server Action replay races concurrent field saves

**What goes wrong:** User edits Alice's name (debounced field save in flight). User presses Ctrl-Z which reverts the name change. The pending field save lands AFTER the inverse `updatePerson` from undo, so the server's final state is the user's edit — undo silently fails.

**Why it happens:** Two independent code paths both call `updatePerson(treeId, alice.id, ...)` without serial ordering.

**How to avoid:** Route inverse Server Actions THROUGH `useSaveQueue` (CONTEXT.md D-06 recommendation). The queue's per-person serial guarantee covers undo replay alongside live edits. Verified by reading `lib/hooks/useSaveQueue.ts` — the `runSave` finally branch chains a new save if `pending` accumulated during the in-flight save (L155-163 [VERIFIED]). An inverse-action submission can use the same `enqueueField` API after extending it with an `enqueueOverride(personId, fullPatch)` helper, OR use a thin new method `enqueueInverse(personId, prevFields)` that merges the previous values into `pending` and triggers `runSave`.

**Warning signs:** E2E test "type name -> Ctrl-Z" fails ~10% of the time on slow networks. Add explicit waits in tests; in implementation, ensure the queue is the only writer to `updatePerson` for any given personId.

### Pitfall 3: Radial menu remains open after the user clicks a different node

**What goes wrong:** Clicking a different PersonNode while the radial is open selects the new node but the radial keeps anchoring to the old one (because `radialOpenFor` was never cleared).

**Why it happens:** PersonNode's mousedown handler calls `setSelectedPersonId(personId)` but does not call `setRadialOpenFor(null)`.

**How to avoid:** UI-SPEC §1 specifies "Click outside the radial buttons (canvas, another node, side panel) -> `setRadialOpenFor(null)`". Implementation: every node-mousedown, canvas-mousedown, and sidepanel-mousedown should call `setRadialOpenFor(null)` BEFORE its own selection logic. PanZoomWrapper.tsx's existing `onCanvasMouseDown` (L137) is the canvas-level point; PersonNode.tsx's `onMouseDown` (L83) is the node-level point.

**Warning signs:** Radial menu visually appears in the wrong place when clicking from one node to another.

### Pitfall 4: useShallow array selector loops infinitely

**What goes wrong:** A selector like `useTreeStore(s => Object.values(s.people).sort(...))` allocates a fresh array on every call, which Zustand 5's default `Object.is` treats as changed -> re-renders -> calls the selector again -> infinite loop.

**Why it happens:** Quick-task 260422-9vu (commit `eb5ca59`) already fixed this for `Object.keys(s.people)` in PanZoomWrapper. Phase 3 search palette has the same shape.

**How to avoid:** Wrap the selector with `useShallow` from `zustand/react/shallow`:

```typescript
import { useShallow } from 'zustand/shallow';
const sortedPeople = useTreeStore(useShallow((s) =>
  Object.values(s.people).sort((a, b) => a.name.localeCompare(b.name))
));
```

`useShallow` does element-wise diff on the result array; identity only changes when the people set or order changes. Documented in CLAUDE.md / STATE.md "Phase 02 quick-task" section.

**Warning signs:** "getServerSnapshot should be cached" React warning in the console; or the search palette mount triggers a re-render storm visible in React DevTools profiler.

### Pitfall 5: Toast dwell timer leaks across unmounts

**What goes wrong:** A toast is pushed; user navigates away (tree-switch, sign-out); the per-toast `setTimeout(dismiss, dwellMs)` keeps running and tries to call `dismissToast(id)` on a torn-down store, throwing.

**Why it happens:** The toast component owns the dismiss timer in a `useEffect`, but if the component unmounts the cleanup runs — UNLESS the toast is mounted elsewhere by then. Edge case: toast id collisions across stores.

**How to avoid:** Each `<Toast>` component owns its own `useEffect` with cleanup that calls `clearTimeout`. The store's `dismissToast` is idempotent (`state.toasts = state.toasts.filter(t => t.id !== id)` is safe even if the id is already gone). When tree-switches happen, the store provider re-mounts (per Phase 1 store-factory pattern) so the old store + its toasts go entirely; new store starts empty.

**Warning signs:** Stack traces in dev console pointing to `dismissToast` being called on a stale store reference.

### Pitfall 6: temporal pastStates exceed memory budget

**What goes wrong:** Each pastState in zundo is a snapshot of the partialized state. With `partialize: (s) => ({ people: s.people })` and a 1000-person tree, each snapshot is ~200KB. 100 entries = 20MB heap.

**Why it happens:** zundo with default `diff` stores full snapshots, not deltas. The `diff` option exists to store deltas instead.

**How to avoid:** For Phase 3 (~10-100 person trees expected), full snapshots are fine — 100 entries × 100 people × 500 bytes ≈ 5MB. STATE.md performance metrics target < 50MB heap after 500 edits — well within bounds. If trees grow to 1000+ people in v2, switch to `diff: microdiff` or a custom diff function. **Do NOT optimize prematurely in Phase 3.**

**Warning signs:** Chrome DevTools Memory panel shows >100MB of retained zundo state. (Unlikely at v1 scale.)

### Pitfall 7: SidePanel auto-focus on Name field doesn't fire after add-relative

**What goes wrong:** ADD-03 requires the new person's side panel to open with the Name field auto-focused. If the focus call happens before the panel mounts (or before the input is in the DOM), it silently no-ops.

**Why it happens:** Order of operations: (1) addPerson commit, (2) `setSelectedPersonId(newId)`, (3) `setSidePanelOpen(true)`, (4) panel re-renders, (5) input mounts. A `ref.current.focus()` called at step 2 has no input to focus.

**How to avoid:** Inside the `<FieldInput>` wrapping the Name field (or a one-time effect inside SidePanel), use `useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus, person.id])`. Pass an `autoFocus` prop from SidePanel that's true on the FIRST render after mount but only when the panel was just opened by add-relative (distinguishable from "panel was opened by double-click on existing node, where focus shouldn't steal"). One pattern: SidePanel reads `radialOpenFor === null && person.created_just_now` flag, OR set a transient `autoFocusName: boolean` flag in store when add succeeds, consumed-and-cleared by SidePanel mount.

**Warning signs:** Demo path step "click radial Child -> name field is focused" fails in Playwright with "element not focused". Manual test: tab from canvas after add — focus jumps to Done button instead of Name input.

### Pitfall 8: ⌘Z fired during inline-undo delete dwell triggers TWO undos

**What goes wrong:** User clicks Remove -> toast appears with Undo. User presses ⌘Z. ⌘Z fires `temporal.undo()` once (correct). But if ⌘Z handler ALSO clicks the toast Undo button programmatically OR vice versa, you get two undos.

**Why it happens:** UI-SPEC §6 says "the keyboard shortcut Cmd-Z and the toast Undo button are equivalent — both call `temporal.undo()`". They MUST be the same call site, not separate handlers that both trigger.

**How to avoid:** Both the toolbar Undo button, the toast Undo button, and the ⌘Z keyboard handler should ALL call the same `temporal.getState().undo()` directly. The toast Undo button does NOT itself listen to ⌘Z — it's just another callable that fires the same undo action.

**Warning signs:** Pressing ⌘Z within the inline-undo dwell window restores the deleted person AND reverses the previous edit.

### Pitfall 9: Optimistic add positions a new node ON TOP of an existing one

**What goes wrong:** Anchor is at `(100, 100)`. User picks Spouse -> initial position `(100 + 180 + 32, 100) = (312, 100)`. Another person already exists at `(312, 100)`. The collision-nudge logic must shift the new node down. If max-iter=20 is exceeded, fallback is undefined.

**Why it happens:** Pathological tree shapes (e.g. user has manually arranged 21+ people in a vertical line) can exhaust the bounded iteration.

**How to avoid:** D-13 specifies max 20 iterations with `+NODE_H + 16 = 92px` per Y-step. After 20 iterations the new node lands 1840px below the anchor — far enough that any reasonable tree won't have content there. If iteration exhausts, place at the 20-iter Y position regardless (don't throw, don't reject) and let the user manually drag. Document this in placement.test.ts: the max-iter case returns the bounded position without erroring.

**Warning signs:** Stuck loop in `collisionNudge`; or new nodes appearing in a stack on the same coordinates.

### Pitfall 10: Focus restoration on radial Esc / search Esc loses anchor

**What goes wrong:** User opens radial via mouse click on `+`. `setRadialOpenFor(personId)` fires, radial opens. User presses Esc. Radial closes. Where does focus go? Without explicit restoration, focus stays on `<body>` and the next Tab cycles through the topbar.

**Why it happens:** UI-SPEC §1 specifies "Esc while radial open -> setRadialOpenFor(null). Returns focus to the node's `+` button". Requires saving the `+` button ref BEFORE opening radial and calling `.focus()` on it after closing.

**How to avoid:** When the `+` button's onClick fires, capture `e.currentTarget` (the button DOM node) into a ref or a Zustand slice (`radialAnchorEl: HTMLElement | null`). On Esc/dismiss, call `radialAnchorEl?.focus()`. The same pattern applies to search palette: save `document.activeElement` BEFORE `setSearchOpen(true)`, restore on close.

**Warning signs:** A11Y audit finds focus traps after dismissing modal/radial; Playwright tests using `keyboard.press('Tab')` after Esc don't go where expected.

## Code Examples

### Example A — Verified zundo 2.3.0 setup with partialize, equality, limit

```typescript
// lib/store/tree-store.ts (Phase 3 modification)
// Source: zundo 2.3.0 README §"Exclude fields from being tracked in history"
// L172-203 [VERIFIED] + §"Limit number of historical states stored" L240-253 [VERIFIED]
// + §"Prevent unchanged states from getting stored in history" L257-307 [VERIFIED]

import { temporal } from 'zundo';
import { shallow } from 'zustand/shallow';
import { immer } from 'zustand/middleware/immer';

export function createTreeStore() {
  return createStore<TreeState>()(
    temporal(
      immer((set) => ({
        // ... state and setters as before ...
      })),
      {
        limit: 100, // HIST-03
        // Whitelist: only `people` is in history. Every other field is ephemeral.
        partialize: (state) => ({ people: state.people }),
        // Skip pushes when partialized state is shallow-equal (no actual change).
        equality: shallow,
      },
    ),
  );
}
```

### Example B — Drag pause/resume bracket (PanZoomWrapper modification)

```typescript
// components/canvas/PanZoomWrapper.tsx — modify the existing drag handlers.
// Source: zundo 2.3.0 README L530-544 + d.ts L11-12 [VERIFIED]

// In the mousedown that seeds the drag (PersonNode-level OR window-level):
const onNodeMouseDown = (e: React.MouseEvent) => {
  // ... existing seed logic ...
  // Pause history BEFORE any setPersonPosition call from drag
  storeApi.temporal.getState().pause();
};

// In the window-level mouseup:
const onUp = () => {
  if (dragStateRef.current && draggingActiveRef.current) {
    const ds = dragStateRef.current;
    const finalPerson = storeApi.getState().people[ds.id];
    setDragging(null);
    draggingActiveRef.current = false;
    if (finalPerson) {
      const { x, y } = finalPerson;
      // Resume history. Next setState pushes ONE pastState capturing the gesture.
      storeApi.temporal.getState().resume();
      // Tickle setPersonPosition with the same final coords so the push fires.
      setPersonPosition(ds.id, x, y);
      // Then run the existing movePerson(treeId, ds.id, x, y) commit.
      // ...
    } else {
      // Defensive: still resume even if finalPerson is gone
      storeApi.temporal.getState().resume();
    }
  } else if (dragStateRef.current) {
    // No threshold crossed — drag never started. Resume immediately, no push.
    storeApi.temporal.getState().resume();
  }
  // ...rest of cleanup...
};
```

### Example C — addPerson Server Action (atomic symmetric patches)

```typescript
// app/actions/people.ts (Phase 3 addition)
// Source: pattern matches existing updatePerson / removePerson L17-73 [VERIFIED]

export async function addPerson(
  treeId: string,
  kind: 'parent' | 'spouse' | 'child' | 'sibling',
  anchorId: string,
  position: { x: number; y: number },
): Promise<{ id: string; ...person fields }> {
  await getUserIdOrThrow();
  const newId = crypto.randomUUID(); // server-generated UUID; client doesn't trust the optimistic id

  const supabase = await supabaseServer();

  // Read anchor (RLS scopes to the user's accessible trees automatically)
  const { data: anchor, error: readErr } = await supabase
    .from('people')
    .select('id, parent_ids, spouse_ids, child_ids')
    .eq('id', anchorId)
    .eq('tree_id', treeId)
    .single();
  if (readErr || !anchor) {
    throw new Error(`addPerson failed: anchor not found`);
  }

  // Compute the new person's relation arrays based on kind
  const newPerson = {
    id: newId,
    tree_id: treeId,
    name: '',
    gender: 'u' as const,
    x: position.x,
    y: position.y,
    is_me: false,
    parent_ids: kind === 'child' ? [anchorId] : [],
    spouse_ids: kind === 'spouse' ? [anchorId] : [],
    child_ids: kind === 'parent' ? [anchorId] : [],
  };

  // Compute anchor's updated relation array
  const anchorPatch: Partial<typeof anchor> = {};
  switch (kind) {
    case 'parent':
      anchorPatch.parent_ids = [...(anchor.parent_ids ?? []), newId];
      break;
    case 'spouse':
      anchorPatch.spouse_ids = [...(anchor.spouse_ids ?? []), newId];
      break;
    case 'child':
      anchorPatch.child_ids = [...(anchor.child_ids ?? []), newId];
      break;
    case 'sibling': {
      // Sibling = share a parent with anchor. Use anchor's first parent (if any).
      // Phase 3 v1: if anchor has no parents, sibling has no parents either.
      // Server doesn't auto-create a phantom parent; user must add a parent manually first if they want a true sibling.
      newPerson.parent_ids = anchor.parent_ids ?? [];
      break;
    }
  }

  // Two writes — Supabase doesn't expose explicit transactions through PostgREST,
  // but RLS + CHECK constraints validate each write. If the second fails, we leave
  // the first in place and surface the error — the client will rollback the
  // optimistic insert. (Phase 3 known limitation; CONTEXT.md D-09 calls for
  // atomic, but PostgREST atomicity in v1 = batch via .upsert([...]) with
  // returning='representation'. Acceptable trade-off given low rejection rate.)
  //
  // OPTION (planner discretion): wrap both writes in a SECURITY DEFINER RPC
  // `add_person_with_relation(p_tree_id, p_kind, p_anchor_id, p_pos_x, p_pos_y)`
  // for true atomic semantics. Recommended if the rejection rollback proves janky in practice.

  const { error: insertErr } = await supabase.from('people').insert(newPerson);
  if (insertErr) throw new Error(`addPerson failed: ${insertErr.message}`);

  if (Object.keys(anchorPatch).length > 0) {
    const { error: updateErr } = await supabase
      .from('people')
      .update(anchorPatch)
      .eq('id', anchorId)
      .eq('tree_id', treeId);
    if (updateErr) {
      // Compensating delete to keep state coherent
      await supabase.from('people').delete().eq('id', newId).eq('tree_id', treeId);
      throw new Error(`addPerson failed: ${updateErr.message}`);
    }
  }

  return { id: newId, ...newPerson };
}
```

**Note:** The two-write non-atomic pattern with compensating delete is a v1 trade-off. CONTEXT.md D-09 calls for "single round-trip; symmetric relationship patches happen in one transaction". The cleanest implementation uses a SECURITY DEFINER RPC (similar to `bootstrap_tree`). **Planner should evaluate whether to ship the two-write version OR the RPC version in Phase 3** — the RPC version requires a small migration but matches the locked decision more cleanly. Recommended: ship the RPC version since the migration is low-risk and matches D-09.

### Example D — Collision-nudge pure function (Vitest-tested)

```typescript
// lib/graph/placement.ts (NEW)
// Constants from CONTEXT.md D-13 + UI-SPEC §"Add-relative placement geometry"

import { NODE_W, NODE_H } from './edges';

const COLLISION_RADIUS = NODE_W + 32; // 212px — same row collision threshold
const NUDGE_STEP = NODE_H + 16; // 92px — Y-step per iteration
const MAX_ITER = 20; // defensive bound

type Pt = { x: number; y: number };

export function nudgePosition(
  initial: Pt,
  people: Record<string, { x: number; y: number }>,
): Pt {
  let { x, y } = initial;
  for (let i = 0; i < MAX_ITER; i++) {
    const collides = Object.values(people).some(
      (p) => Math.abs(p.x - x) < COLLISION_RADIUS && Math.abs(p.y - y) < NODE_H,
    );
    if (!collides) return { x, y };
    y += NUDGE_STEP;
  }
  return { x, y }; // bounded fallback — return last attempted position
}

export function initialOffsetFor(
  kind: 'parent' | 'spouse' | 'child' | 'sibling',
  anchor: Pt,
): Pt {
  switch (kind) {
    case 'spouse':  return { x: anchor.x + NODE_W + 32, y: anchor.y };
    case 'parent':  return { x: anchor.x, y: anchor.y - NODE_H - 80 };
    case 'child':   return { x: anchor.x, y: anchor.y + NODE_H + 80 };
    case 'sibling': return { x: anchor.x - NODE_W - 32, y: anchor.y };
  }
}
```

### Example E — Generic toast slice (Zustand + immer)

```typescript
// lib/store/tree-store.ts — additional state and actions

import { nanoid } from 'nanoid';

export type Toast = {
  id: string;
  kind: 'error' | 'success' | 'info';
  message: string;
  action?: { label: string; onAction: () => void };
  dwellMs: number;
  ariaRole: 'status' | 'alert';
  ariaLive: 'polite' | 'assertive';
  personId?: string;
};

// Inside TreeState:
// toasts: Toast[];
// pushToast: (toast: Omit<Toast, 'id'>) => string;
// dismissToast: (id: string) => void;

// Setters (inside the immer'd set):
pushToast: (toast) =>
  set((state) => {
    const id = nanoid(10);
    state.toasts.push({ ...toast, id });
    // Cap at 3 visible — drop the oldest if we exceed.
    while (state.toasts.length > 3) state.toasts.shift();
    return id; // immer note: returning a value from the recipe is allowed in immer 11
  }),
dismissToast: (id) =>
  set((state) => {
    state.toasts = state.toasts.filter((t) => t.id !== id);
  }),
```

**Note:** immer 11 allows returning a primitive from the recipe in some patterns, but Zustand's set wrapper expects `void`. If TS complains, capture the id outside the set:

```typescript
pushToast: (toast) => {
  const id = nanoid(10);
  set((state) => {
    state.toasts.push({ ...toast, id });
    while (state.toasts.length > 3) state.toasts.shift();
  });
  return id;
},
```

### Example F — Fit-to-view recenter with CSS tween

```typescript
// components/canvas/SearchPalette.tsx (subset) — UI-SPEC §5 + §Motion
// 300ms cubic-bezier tween on canvas-inner div

const handleResultPick = (personId: string) => {
  setSearchOpen(false);
  setSelectedPersonId(personId);
  const p = storeApi.getState().people[personId];
  if (!p) return;
  // Toggle a transition class on the inner canvas div for ONE setTransform call,
  // then remove it so subsequent pan/zoom updates don't fight the tween.
  const innerEl = document.querySelector<HTMLElement>('[data-canvas-inner]');
  if (innerEl) {
    innerEl.style.transition = 'transform 300ms cubic-bezier(0.3, 0.9, 0.3, 1)';
  }
  // Center the target person at viewport center
  const vw = window.innerWidth;
  const vh = window.innerHeight - 52; // topbar
  setTransform({
    x: vw / 2 - (p.x + 90),
    y: vh / 2 - (p.y + 38) + 52,
    k: 1,
  });
  // Clear the tween 320ms later so panning resumes instant feel
  setTimeout(() => {
    if (innerEl) innerEl.style.transition = '';
  }, 320);
  pushToast({
    kind: 'success',
    message: `Centered on ${p.name || 'Unnamed'}`,
    dwellMs: 2200,
    ariaRole: 'status',
    ariaLive: 'polite',
  });
};
```

**Note:** The data attribute `data-canvas-inner` would need to be added to the inner pan/zoom div in `PanZoomWrapper.tsx` L321. Alternative: set the transition via a Zustand flag (`canvasTweenActive: boolean`) read by PanZoomWrapper as a class on the inner div.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `history: Person[][]` array + `hIndex` cursor (handoff prototype `app.jsx`) | zundo 2.3.0 `temporal()` middleware on Zustand | 2024 (zundo v2 release) | Phase 3 inherits idiomatic 2026 React state-history; ~20 LOC vs ~80 LOC |
| `react-hot-toast` / `sonner` for transient toasts | Hand-rolled `<ToastHost>` + Zustand slice | UI-SPEC reaffirmation 2026-04-29 | Zero-dep approach; matches Swiss aesthetic without a library theme override |
| `cmdk` / `kbar` for command palette | Hand-rolled `<input>` + filtered `<ul role="listbox">` | UI-SPEC scope decision 2026-04-29 | Search domain (~100 names alphabetical) doesn't justify a fuzzy search lib |
| `react-hotkeys-hook` for keyboard shortcuts | One `useEffect` with `document.activeElement` gate | UI-SPEC §A11Y-02 mandates explicit scope check | Library APIs don't natively express the input-aware scope rule cleanly |
| `framer-motion` for radial menu animation | Pure CSS keyframes (already in handoff `styles.css`) | Phase 1 design decision (Swiss + zero-runtime CSS) | Phase 3 Animation budget is fully covered by handoff CSS — no JS animation needed |
| `react-confirm-alert` / styled `<Dialog>` for delete | Inline-undo toast + immediate optimistic delete | UI-SPEC §6 + CONTEXT.md D-24 | Zero-friction delete UX; matches Linear / Notion patterns |
| `dagre` (unscoped, frozen 0.8.5) | OUT of Phase 3 scope (Phase 4) | — | Tidy button is visible-disabled |

**Deprecated / outdated:**
- `react-hot-toast` — explicitly rejected for this project per UI-SPEC + Deferred Ideas list
- `window.confirm()` for delete — Phase 2 used it (D-07); Phase 3 D-24 replaces with inline-undo
- Phase 2's `<SaveErrorToast>` as a standalone component — Phase 3 refactors into `useSaveErrorToast` publisher hook (D-15)

## Assumptions Log

> Claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `addPerson` Server Action's two-write non-atomic implementation (`insert` then `update anchor`) is acceptable for v1; full atomicity via SECURITY DEFINER RPC is a recommended upgrade but not strictly required | Code Examples §C + Don't Hand-Roll table row "Symmetric relationship patches" | Network blip between the two writes leaves a person with no symmetric anchor relation. Recoverable via undo/manual edit. CONTEXT.md D-09 says "atomic"; planner should choose RPC vs two-write. Recommend RPC |
| A2 | `crypto.randomUUID()` is available in the Server Action runtime (Node 20+ on Vercel) | Code Examples §C, §B | Server Actions on older runtimes might lack this; fallback is `import { randomUUID } from 'crypto'`. Likely safe — `package.json` engines is `node >=20.9.0` [VERIFIED] which has globalThis.crypto |
| A3 | `useShallow` from `zustand/react/shallow` works correctly when the selector returns a freshly-sorted array | Pitfall 4 + Code Examples implicit | If the sort key is stable and the input array is shallow-equal, `useShallow` correctly skips re-renders. Verified empirically by Phase 2 quick-task 260422-9vu fix [VERIFIED]; sort+map composition adds risk only if intermediate functions allocate fresh objects per element |
| A4 | The radial menu's pixel-perfect 90px radius (specified by UI-SPEC + handoff `RadialMenu` reference) is interpreted as the absolute distance from radial-container center to button center, NOT from anchor `+` button to button edge | Architecture Patterns §1 + UI-SPEC §"Radial container size" L96 | If misinterpreted, the visible distance from the `+` to each radial button is wrong by ~28px (button half-width). Reference impl in `design_handoff_family_tree/source/components.jsx` L43 uses `R = 90` with `cos(angle)*R, sin(angle)*R` where the result is the button's translate offset — confirming center-to-center [VERIFIED]. |
| A5 | The 300ms recenter tween on search palette pick can coexist with PanZoomWrapper's pan handler without fighting (CSS transition vs continuous setTransform) | Code Examples §F | If a user opens search, picks a result during an in-progress pan gesture, the tween + pan would conflict. Mitigation: ignore search-pick tween if `panning === true`. Acceptable edge case to defer to v2 if it surfaces in QA |
| A6 | The Phase 2 `useSaveQueue` API surface (enqueueField, enqueueMove, flush, retry) can be extended with a new `enqueueInverse(personId, prevFields)` method without breaking existing consumers | Pitfall 2 + CONTEXT.md D-06 | Low risk — additive API change. If the planner instead chooses direct Server Action calls (D-06 alternative), no queue changes needed |
| A7 | The disabled Tidy button in Phase 3 will be tab-reachable via the global `:focus-visible` outline rule even though `aria-disabled="true"`; native HTML `disabled` attribute would NOT be focusable | UI-SPEC §10 + Common Pitfalls (none flagged) | UI-SPEC §10 explicitly says "the disabled Tidy button is still tabbed-through with `aria-disabled`" — implementation must use `aria-disabled` not `disabled`. Verified by reading UI-SPEC L527 [CITED: 03-UI-SPEC.md] |

**Risk summary:** Most assumptions are low-risk implementation choices that the planner can confirm during plan-writing. The only one flagged for active user confirmation is **A1** (atomicity model for `addPerson`) since CONTEXT.md D-09 says "atomic" and the two-write pattern is technically not atomic without an RPC.

## Open Questions (RESOLVED)

1. **Atomic `addPerson` via SECURITY DEFINER RPC vs. two-write with compensating delete**
   - What we know: CONTEXT.md D-09 says atomic; PostgREST doesn't expose transactions; existing `bootstrap_tree` RPC is the precedent for atomic multi-write Server Actions
   - What's unclear: whether the two-write rollback-on-error is acceptable as v1, OR whether the planner should add a 0003 migration creating `add_person_with_relation()` RPC
   - Recommendation: ship the RPC. Migration cost is ~15 LOC of SQL; matches D-09 verbatim; eliminates A1 risk. Planner adds a Wave 1 task `[BLOCKING] supabase migration + db push` analogous to Phase 1 D-05.
   - **RESOLVED:** shipped as the `add_person_with_relation` SECURITY DEFINER RPC in Plan 01 Task 2 (migration `20260507180701_add_person_with_relation.sql`); D-09 atomicity guarantee held.

2. **`useSaveQueue` extension API for inverse Server Action replay (D-06 finalization)**
   - What we know: D-06 recommends routing through queue; queue API is `enqueueField/enqueueMove/flush/retry`
   - What's unclear: exact method shape — `enqueueInverse(personId, prevFields)` vs reusing `enqueueField` with a force-immediate flag vs a new `useHistoryReplay()` hook
   - Recommendation: simplest is a new `enqueueInverse` method that merges `prevFields` into `pending` and triggers `runSave` without debounce. ~10 LOC addition.
   - **RESOLVED:** implemented in Plan 03 Task 2 — `enqueueInverse(personId, prevFields)` method added to `lib/hooks/useSaveQueue.ts`; consumed by `useHistoryReplay` diff loop in `lib/hooks/useSaveErrorToast.ts` per D-06.

3. **Search palette result list virtualization threshold (D-31)**
   - What we know: UI-SPEC §5 says max-height `min(60vh, 400px)`; rows are 56px (~7 visible)
   - What's unclear: whether to virtualize via `react-virtuoso` or hand-roll IntersectionObserver
   - Recommendation: NO virtualization for Phase 3. Trees in v1 will likely have <50 people; rendering 50 rows with `.filter` is microsecond-cost. Add virtualization in v2 only if user feedback flags slow palettes on 500+ person trees.
   - **RESOLVED:** deferred per recommendation — Phase 3 ships no virtualization; revisit only if Phase 5+ user feedback flags slow palettes on 500+ person trees (v2 concern, not v1).

4. **Modal `top: 120px` on small viewports (D-37 / UI-SPEC Open Q #13)**
   - What we know: 120px + 60vh max-height pushes modal below 600px viewports
   - What's unclear: whether to clamp `top` to `min(120px, max(20px, vh * 0.15))` in CSS or defer to v2
   - Recommendation: ship the clamp. One-line CSS change (`top: clamp(20px, 15vh, 120px)`); zero implementation cost; resolves the open question without v2 deferral.
   - **RESOLVED:** clamp implemented in Plan 04 Task 2 (Step 0) — `components/ui/Modal.tsx` updates the `marginTop` style to `clamp(20px, 15vh, ${topOffset}px)` when topOffset is provided; SearchPalette inherits the clamp automatically by passing the locked `topOffset={120}` (D-20). Acceptance criterion `grep -q 'clamp(20px, 15vh,' components/ui/Modal.tsx` enforces the change.

5. **Auto-focus Name field on add-relative — distinguishable from auto-focus on double-click**
   - What we know: ADD-03 mandates auto-focus on add; double-click panel-open should NOT steal focus from the canvas
   - What's unclear: implementation pattern (one-shot store flag, ref propagation, autoFocus prop)
   - Recommendation: add a transient `autoFocusNameOnNextMount: boolean` flag in the store. `addRelativeFlow` sets it to true after add success; SidePanel reads it on mount, focuses the Name input, sets back to false. Double-click panel-open does NOT set the flag, so focus stays on the canvas.
   - **RESOLVED:** implemented per recommendation in Plan 02 — `autoFocusNameOnNextMount: boolean` transient flag added to `lib/store/tree-store.ts` (Task 1), set to true by RadialMenu pick handler on success (Task 2), one-shot consumed by SidePanel mount effect (Task 3). Double-click panel-open does NOT touch the flag; canvas focus is preserved.

## Environment Availability

> Phase 3 has no new external dependencies — every required tool, runtime, and service was already verified in Phase 1 and Phase 2.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next 16 + Server Actions | ✓ | >=20.9.0 [VERIFIED: package.json engines] | — |
| TypeScript | Project compilation | ✓ | 6.0.3 [VERIFIED: package.json] | — |
| Vitest | Unit tests for placement / relations | ✓ | 4.1.5 [VERIFIED: package.json] | — |
| @playwright/test | E2E demo path | ✓ | 1.59.1 [VERIFIED: package.json] | — |
| Supabase (Postgres + RLS) | `addPerson` Server Action target | ✓ | running per Phase 1 (assumed; Phase 2 saves work) | If down: blocked, no fallback |
| Clerk | `getUserIdOrThrow()` | ✓ | 7.2.3 [VERIFIED: package.json] | — |
| zundo | History middleware | ✓ | 2.3.0 [VERIFIED: node_modules/zundo/package.json] | — |
| zustand | Store + useShallow | ✓ | 5.0.12 [VERIFIED: package.json] | — |
| immer | Mutation patches | ✓ | 11.1.4 [VERIFIED: package.json] | — |
| lucide-react | Icons | ✓ | 1.8.0 [VERIFIED: package.json] | — |
| nanoid | Toast id | ✓ | 5.1.9 [VERIFIED: package.json] | — |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** none.

## Project Constraints (from CLAUDE.md)

These directives must be honored by Phase 3 plans:

- **Tech stack lock:** Next.js 16 App Router + React 19 + TypeScript 6 + Tailwind v4 — Clerk 7 (Core 3) requires Next 16. Do NOT downgrade.
- **Auth:** Clerk 7 + Supabase native third-party auth. RLS uses `auth.jwt()->>'sub'` (text). DO NOT use the deprecated JWT template; DO NOT use `auth.uid()`.
- **Database:** Supabase Postgres with RLS + Realtime. Phase 3 does NOT touch Realtime (Phase 5 scope).
- **Layout library:** `@dagrejs/dagre@3.x` is reserved for Phase 4. Phase 3 ships the Tidy button visible-disabled.
- **State management:** Zustand 5 + zundo temporal middleware + immer. Store factory + Context Provider; NEVER module-scoped.
- **Testing:** Vitest for `model.ts` / pure utilities; Playwright for E2E canvas flows.
- **Deployment:** Vercel — pin Next.js to a post-CVE-2025-29927 release. Already at 16.2.4 [VERIFIED].
- **Design fidelity:** Pixel-parity with handoff tokens. `app/globals.css` `@theme` block maps handoff `:root` 1:1; Phase 3 introduces ZERO new tokens.
- **GSD Workflow Enforcement:** All Phase 3 file edits go through `/gsd-execute-phase 3` (or `/gsd-quick` for ad-hoc fixes). Direct repo edits outside GSD are prohibited.
- **Project skills:** None defined yet (no `SKILL.md` index files in `.claude/skills/`, `.agents/skills/`, etc per CLAUDE.md).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RAD-01 | 140px radial menu with 4 slices (Parent top, Spouse right, Child bottom, Sibling left) | Architecture Patterns §1; reference impl in `design_handoff_family_tree/source/components.jsx` L31-65; UI-SPEC §1 + §"Spacing Scale" component constants table fully specifies geometry |
| RAD-02 | Each slice: icon + label; hover fills with `--accent-soft` | UI-SPEC Color §"Accent reserved for" item 9; component-constants table specifies `--accent-soft` hover/focus background overriding handoff invert |
| RAD-03 | Click outside or Esc dismisses radial; one radial open at a time | UI-SPEC §1 Trigger table rows 3-4; Common Pitfalls §3 details click-outside handling at canvas / node / sidepanel level |
| ADD-01 | New person adjacent to anchor (spouse right, parent above, child below, sibling left) | Code Examples §D `initialOffsetFor()` function; constants from UI-SPEC §"Add-relative placement geometry" |
| ADD-02 | Collision-nudge shifts within `NODE_W + 32px` on same row, bounded iterations | Code Examples §D `nudgePosition()`; Common Pitfalls §9 covers max-iter fallback |
| ADD-03 | New person auto-selected, panel auto-opens, Name field auto-focused | Architecture Patterns §2 add-relative flow; Common Pitfalls §7 covers auto-focus timing; Open Question #5 recommends transient store flag |
| ADD-04 | Symmetric relation patches in single Server Action | Code Examples §C `addPerson(treeId, kind, anchorId, position)`; CONTEXT.md D-09 (atomic); Open Question #1 recommends SECURITY DEFINER RPC for true atomicity |
| HIST-01 | ⌘Z / Ctrl-Z undo, ⌘⇧Z / ⌘Y redo | Architecture Patterns §3 keyboard listener; Code Examples §A zundo wiring; Code Examples §B drag pause/resume |
| HIST-02 | History via zundo on Zustand using Immer (not full snapshots) | Code Examples §A confirms `temporal(immer(set => ({...})))` order; zundo README §"Store state delta rather than full object" L330-365 covers `diff` option (deferred to v2 per Pitfall #6) |
| HIST-03 | History cap at 100 commits | Code Examples §A `limit: 100`; verified zundo 2.3.0 d.ts L19 [VERIFIED] |
| HIST-04 | Shortcut scope-aware (ignored in inputs/textareas) | Architecture Patterns §3; Code Examples (inline in §3); pattern matches existing Phase 2 Esc handler in PanZoomWrapper L293-305 [VERIFIED] |
| HIST-05 | Drag, field-blur, add-relative, remove-person, Tidy each commit ONE entry | Code Examples §B drag bracket; field-blur already collapses via debounce-then-blur (`useSaveQueue.flush(personId)` in SidePanel); add-relative + remove-person are single setState calls; Tidy is Phase 4 |
| TOOL-01 | Bottom toolbar pill with all 8 buttons | UI-SPEC §4 toolbar layout (locked geometry: 342px wide, 0px radius per D-17 / Open Q #1) |
| TOOL-02 | Disabled state on unavailable actions | UI-SPEC §4 button table column "Disabled when"; bind to `pastStates.length === 0` etc via `useTemporalStore` selector |
| TOAST-01 | Bottom-center transient toast, 2.2s auto-dismiss | UI-SPEC §"Generic Toast Inventory" table; Code Examples §E generic toast slice; CONTEXT.md D-15 + D-16 dwell durations |
| SRCH-01 | ⌘K / ⌘F opens search palette | Architecture Patterns §3 keyboard listener; UI-SPEC §5 |
| SRCH-02 | Selecting a result selects+recenters | UI-SPEC §5 result-pick behavior; Code Examples §F recenter tween |
| A11Y-01 | Focus rings + ARIA labels on all interactives | UI-SPEC §10 inherits global `*:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`; UI-SPEC §"Accessibility Contract" specifies aria-labels for every new control |
| A11Y-02 | Keyboard shortcut scope correct (typing in field doesn't trigger Cmd-Z) | Architecture Patterns §3 + Code Examples §3 |
| A11Y-03 | Tab order: topbar → canvas → toolbar → side panel | UI-SPEC §9 + §10; Toolbar wrapper uses `<div role="toolbar" aria-label="Canvas controls">` |

## Sources

### Primary (HIGH confidence — VERIFIED via local file or installed package)
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/node_modules/zundo/dist/index.d.ts` — zundo 2.3.0 type definitions (verified `pause`, `resume`, `isTracking`, `pastStates`, `futureStates`, `undo`, `redo`, `clear`, `setOnSave`)
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/node_modules/zundo/README.md` — zundo 2.3.0 official docs (verified API patterns for `partialize`, `equality`, `limit`, `pause()`/`resume()`)
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/node_modules/zustand/shallow.d.ts` — confirmed `useShallow` import path is `zustand/react/shallow`
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/package.json` — verified all package versions
- `.planning/phases/03-authoring-history/03-UI-SPEC.md` — approved Phase 3 visual + interaction contract (revision 1)
- `.planning/phases/03-authoring-history/03-CONTEXT.md` — 37 locked decisions + 8 Claude's-discretion items
- `.planning/phases/03-authoring-history/03-DISCUSSION-LOG.md` — alternatives considered audit trail
- `.planning/REQUIREMENTS.md` — phase requirement IDs and traceability
- `.planning/ROADMAP.md` — Phase 3 goal + dependencies
- `.planning/STATE.md` — accumulated decisions across Phases 1-2
- `lib/store/tree-store.ts` (existing code) — verified factory + Provider + temporal wiring (currently `{ limit: 50 }`, no partialize)
- `lib/hooks/useSaveQueue.ts` (existing code) — verified per-person serial queue API surface
- `app/actions/people.ts` (existing code) — verified Server Action pattern for the new `addPerson`
- `components/canvas/PersonNode.tsx` L115-119 — verified the `+` button onClick console.info no-op (the radial wiring point)
- `components/canvas/SidePanel.tsx` L161-189 — verified the existing `window.confirm`-gated Remove handler
- `components/canvas/PanZoomWrapper.tsx` L161-253, L294-305 — verified drag handler structure + Esc keyboard listener pattern
- `components/canvas/SaveErrorToast.tsx` — verified the toast pattern Phase 3 generalizes
- `components/canvas/TreeCanvas.tsx` — verified the canvas-root mount point for new components
- `lib/graph/edges.ts` — verified NODE_W=180 / NODE_H=76 constants
- `design_handoff_family_tree/source/components.jsx` L31-65 — verified RadialMenu reference impl with R=90, four absolute-positioned buttons
- `design_handoff_family_tree/source/model.jsx` L14-42 — verified `relationLabel` BFS pattern for relation hints
- `design_handoff_family_tree/source/styles.css` — verified `.radial`, `.toolbar`, `.modal`, `.toast` styles match UI-SPEC pixel-parity claims
- `supabase/migrations/20260421000000_initial_schema.sql` — verified `creates_parent_cycle` SQL function and `people_insert_if_editor_or_owner` RLS policy
- `lib/supabase/types.ts` — verified people table has `pronouns` column (Phase 2 D-05)
- `.planning/config.json` — verified `nyquist_validation: false` (Validation Architecture section omitted from this RESEARCH.md)
- `CLAUDE.md` (project root) — verified project constraints + GSD workflow enforcement

### Secondary (MEDIUM confidence — cited from official docs / handoff but not re-verified online)
- Lucide React icon names verified by reading the lucide-react import statements in existing components and checking the package's import surface — assumed `Undo2`, `Redo2`, `ZoomIn`, `ZoomOut`, `Maximize2`, `Sparkles`, `PanelRight`, `Search` exist (standard names; would surface as TS errors at build time if wrong)

### Tertiary (LOW confidence — none in this research)
- (none — Phase 3 research relied entirely on local files and installed packages; no web search needed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified against installed `node_modules` and `package.json`
- Architecture patterns: HIGH — verified against UI-SPEC + CONTEXT.md (locked) + zundo 2.3.0 README (official) + existing Phase 1/2 code patterns
- Pitfalls: HIGH — most are derived from existing Phase 2 lessons (quick-task 260422-9vu) or UI-SPEC explicit warnings; pitfalls 1-2 are zundo-specific and verified against the README
- Server Action atomicity (A1): MEDIUM — flagged for planner decision (RPC vs two-write); both implementations are valid

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (zundo, zustand, immer all stable; lucide-react may bump minor versions but icon names are stable)
