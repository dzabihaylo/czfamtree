# Phase 3: Authoring & History - Context

**Gathered:** 2026-04-29 → 2026-05-07 (resumed)
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers the **authoring loop + history + search** that turns Phase 2's view-and-edit canvas into a tool a user can actually grow a tree with:

1. **Radial add menu** anchored to the selected node's `+` button — Parent / Spouse / Child / Sibling slices that wire the existing Phase 2 console.info no-op (PersonNode.tsx L117-119) to a real `setRadialOpenFor(personId)` action.
2. **Add-relative authoring loop** — single atomic Server Action `addPerson(treeId, kind, anchorId, position)`, collision-nudge placement (max 20 iterations), optimistic-local commit, auto-select + side-panel open + Name field auto-focus.
3. **Undo/redo via zundo** — 100-entry cap, scope-aware shortcut (no-op in inputs/textareas/contenteditable), ONE history entry per drag gesture / field-blur / add / remove. Drag uses `temporal.pause()` / `resume()` bracket. `partialize` excludes ALL ephemeral state.
4. **Bottom-center toolbar pill** — Undo / Redo / Zoom-out / Zoom% / Zoom-in / Fit (reset-to-default per CANV-05) / Tidy (visible-disabled, Phase 4 wires) / Panel-toggle.
5. **Generic toast infra** — replaces Phase 2's bespoke `<SaveErrorToast>`. Backed by `useTreeStore.toasts: Toast[]` + `pushToast` / `dismissToast`. Max 3 visible, stacked at `bottom: 80px` with 8px gap.
6. **⌘K / ⌘F search palette** — 520px modal at `top: 120px`, alphabetical filter, Enter selects + recenters (300ms tween) + toast `Centered on {name}`. Pure select+center; does NOT auto-open the side panel (per SRCH-02). Includes the `is_me` person.
7. **Inline-undo Delete** (PANEL-07 final form) — replaces Phase 2's `window.confirm()` on the SidePanel Remove button. Optimistic delete + `temporal.pastStates.push` + 6000ms toast `Removed {name} · Undo`. ⌘Z within window OR clicking Undo OR letting it expire all leave the action undoable through the normal stack.
8. **Reusable `<Modal>` primitive** — `components/ui/Modal.tsx` (backdrop + box + popIn). Consumed by SearchPalette in P3, by Share modal in P5.
9. **Accessibility sweep** — focus rings on every new control, ARIA labels, scoped keyboard shortcuts (input-aware), Tab order topbar → canvas → toolbar → side panel.

**Demo path (Phase 3 'complete' gate — Playwright E2E + manual smoke must both be green):**
sign in → select You → `+` → **Parent** → name → `+` → **Child** → name → ⌘Z (reverts each step) → ⌘⇧Z (replays) → drag a node → ⌘Z (one entry) → ⌘K → search → Enter → centers → **Remove** on side panel → toast `Removed X · Undo` → click Undo.

**Boundary policy:** flag and present trade-offs to the user; don't auto-decide where the boundary lies (lesson from the Phase 2 boundary feedback — passing tests ≠ shipping a usable user loop).

**OUT of scope (explicit, do not build in P3):**

- **Tidy / dagre layout itself** — Phase 4 (TIDY-01..05). The toolbar Tidy button renders **disabled** in P3 (0.3 opacity, cursor not-allowed, no click handler). Layout transition animations are Phase 4.
- **Share modal + invites + Realtime presence + cursors + broadcast** — Phase 5. The `<Modal>` primitive shipped in P3 is the foundation Share modal will reuse, but the Share UI itself is not in P3.
- **Phase 2 code-review fixes (`02-REVIEW.md`, 6 warnings)** — separate `/gsd-code-review-fix 02` run. Do NOT fold into Phase 3 plans. Keep polish workstream isolated.
- **Photo upload, right-click context menu, per-node arrow-key traversal, GEDCOM import** — v2 / out of scope per PROJECT.md.
- **Animated tooltip on toolbar hover, `aria-keyshortcuts`** — v2 (visible tooltip styling deferred; aria-label only in v1).
- **Bbox-aware Fit** — v2 (CANV-05 ships reset-to-default `{x:400, y:180, k:1}`).

</domain>

<decisions>
## Implementation Decisions

### A. Phase Boundary + Demo Path

- **D-01:** **Phase 3 'complete' gate is the full demo path** (above) running green in Playwright AND passing a manual smoke. Vitest covers pure utilities (`collisionNudge`, relation walker for search hints, history-replay diff). Anything below the demo path is rework, not Phase-3-completion.
- **D-02:** **Do not auto-decide phase boundaries.** Phase 2 shipped a "skeleton" the user couldn't add anyone to — this was the Phase 2 boundary lesson. For P3, surface trade-offs explicitly when a slice would land without enabling the demo path. The Phase 3 demo path itself IS the boundary — if a sub-slice can't reach the next demo-path step, flag it before committing.

### B. Undo/Redo Server-Sync Model

- **D-03:** **Replay model = inverse Server Actions per affected person.** zundo restores Zustand to the prior `pastState`; an effect diffs prior↔next `people` Map and fires per-person Server Actions:
  - `addPerson` ↔ `removePerson(id)`
  - `removePerson` ↔ `addPerson(id, fullRecord)` (full record stashed in zundo pastState — see D-05)
  - field edit ↔ `updatePerson(id, prevFields)`
  - drag ↔ `movePerson(id, prevX, prevY)`
- **D-04:** **Failure UX when an inverse Server Action rejects = optimistic-local revert + per-person red pill + single toast `Couldn't sync history` (4400ms) with Retry button.** The local zundo state still reverts (so the user sees their ⌘Z land); affected persons' SavePill flips red; the toast lets them re-fire the inverse actions. Mirrors Phase 2's per-person SAVE error pattern (lowest UX friction, consistent with existing surface). Locked from UI-SPEC §3 + this discussion.
- **D-05:** **Removed-person record stash → Claude's discretion (planner picks).** Recommended path: zundo `pastStates` carries the full record via `partialize: { people }` — since the entire `people` map is snapshotted in each pastState, the removed person's full record (name, fields, relations, x/y) is naturally available in the prior pastState. No side cache or soft-delete column needed for v1. Final wiring lands in PLAN.md after researcher reads zundo 2.x docs.
- **D-06:** **Replay routing through useSaveQueue vs direct Server Actions → Claude's discretion (planner picks).** Recommended path: route inverse actions THROUGH `useSaveQueue` so the per-person serial guarantee Phase 2 ships also covers undo/redo. Pill lifecycle stays consistent (Saving → Saved/error). Cost: slight wiring overhead. Final call in PLAN.md after planner verifies the queue API surface accommodates inverse calls.
- **D-07:** **History entry granularity** (locked from UI-SPEC §3, recap):
  - One entry per drag gesture (mousedown→mouseup wrapped in `temporal.pause()` / `resume()`).
  - One entry per field-blur (intermediate keystrokes are optimistic-local only, NOT history pushes).
  - One entry per add-relative (radial pick).
  - One entry per remove-person (Remove button click).
  - History cap: 100 entries (`temporal({ limit: 100 })`).
  - `partialize` excludes ALL ephemeral state: `selectedPersonId`, `sidePanelOpen`, `draggingPersonId`, `dragOrigin`, `saveStateByPersonId`, `transform`, `radialOpenFor`, `searchOpen`, `searchQuery`, `toasts`, `panZoomMode`. Only `people` is in history snapshots.
- **D-08:** **Scope-aware shortcuts (HIST-04 + A11Y-02).** The single keyboard listener (mounted at TreeCanvas level) checks `document.activeElement` against `INPUT`, `TEXTAREA`, `[contenteditable="true"]` BEFORE dispatching ⌘Z, ⌘⇧Z, ⌘Y, ⌘K, ⌘F. If true, returns immediately so native input/browser behavior runs (textarea undo, browser Find-in-page). The toast inline-undo button stays reachable via Tab regardless.

### C. Add-Relative Pipeline + Error UX

- **D-09:** **Server action shape = single atomic `addPerson(treeId, kind, anchorId, position)`.** One round-trip; symmetric relationship patches happen in one transaction (e.g. `addRelative('spouse', a, b)` writes `a.spouseIds += [b]` AND `b.spouseIds += [a]` together; same for parent — writes both `parent_ids` on child AND `child_ids` on parent). Atomic = no risk of half-applied state from a network blip mid-call. Locked by UI-SPEC §2 + ADD-04.
- **D-10:** **Parent-cap edge case (DATA-06: max 2 parents) = server rejects, surfaces SaveErrorToast `Couldn't add parent — already has two`.** The radial Parent button is NOT pre-disabled at 2 parents — server rejection is authoritative; client doesn't try to mirror server invariants. Trade-off: one extra round-trip on the rare edge case in exchange for simpler client logic and no schema-drift maintenance. Acceptable.
- **D-11:** **Cycle prevention (DATA-07) = server-side cycle-detection walk on add.** UI surfaces failure as SaveErrorToast `Couldn't add {kind} — would create a cycle`. Same surface as the parent-cap failure — generic `addPerson` rejection toasts.
- **D-12:** **Optimistic vs buffered failure UX → Claude's discretion (planner picks).** Recommended path: optimistic-first per Phase 2 pattern — node appears immediately at the computed position with the SavePill on the new node already showing `Saving…`. On server failure, roll back local state (~200-500ms flash) AND surface SaveErrorToast `Couldn't add {kind} · {anchor name}` with Retry. The brief flash is acceptable feedback that something was attempted; matches the "effortless" Phase 3 feel. Alternative considered: buffered-until-ACK (no flash, but adds 200-500ms latency on every happy path — rejected because happy path is the common case).
- **D-13:** **Collision-nudge algorithm** (locked from UI-SPEC §2 + ADD-02):
  - Initial offsets: Spouse `(+NODE_W + 32, 0)`, Parent `(0, -NODE_H - 80)`, Child `(0, +NODE_H + 80)`, Sibling `(-NODE_W - 32, 0)` from anchor.
  - Collision detection radius: `NODE_W + 32 = 212px` on the same row.
  - Nudge step: `+NODE_H + 16 = 92px` along Y per iteration.
  - Max 20 iterations (defensive bound; prevents infinite loop on pathological tree shapes).
  - Lives as a pure function in `lib/graph/placement.ts` — Vitest unit tests cover singleton, occupied row, deep nudge chain, max-iter fallback.
- **D-14:** **Add-relative ACK UX** (locked from UI-SPEC §2 + REQUIREMENTS RAD/ADD): on server ACK, `setSelectedPersonId(newPerson.id)` → `setSidePanelOpen(true)` → side panel mounts with Name field auto-focused via `useRef + .focus()` in panel mount effect. Confirmation toast `Added {kind} · {anchor name}` (2200ms, no Undo button — undo is via ⌘Z).

### D. Toolbar + Toast Infrastructure

- **D-15:** **Generic toast infra replaces Phase 2 `<SaveErrorToast>`.** New shape:
  - Zustand slice: `toasts: Toast[]`, `pushToast(toast): string`, `dismissToast(id): void`.
  - `<ToastHost>` mounts once at canvas level; renders one `<div>` per toast at `bottom: 80px` stacked 8px gap.
  - Max 3 visible; oldest auto-dismissed when 4th arrives. Per-person save-errors merge at the publisher level (matches Phase 2 SaveErrorToast convention — one toast per oldest-errored person, not per error).
  - Phase 2's `<SaveErrorToast>` becomes a publisher hook (`useSaveErrorToast`) that subscribes to `saveStateByPersonId` and calls `pushToast({ kind: 'error', ..., dwellMs: 4400, ariaRole: 'alert', ariaLive: 'assertive' })`.
- **D-16:** **Dwell durations**: 2200ms for confirmations (Added, Centered, Tidied), 4400ms for save errors and history-sync errors, 6000ms for inline-undo Delete (consequential + needs reachable Undo). Locked from UI-SPEC §"Generic Toast Inventory".
- **D-17:** **Toolbar geometry locked**: 40×40 buttons, 1px `--rule` dividers between zoom group and action group, 0px border-radius (Swiss; overrides REQUIREMENTS TOOL-01 "16px" — that's a transcription error per UI-SPEC Open Q #1 + Phase 2 grid-spacing typo precedent), `--bg-card` bg, 1px `--ink` border, `4px 4px 0 var(--ink)` shadow, `bottom: 20px`. Lucide icons 16px.
- **D-18:** **Tidy button visible-disabled in Phase 3** (0.3 opacity, cursor not-allowed, no click handler, `aria-disabled="true"` so SR users hear "Tidy layout, dimmed" on Tab). Phase 4 wires it without re-flowing toolbar geometry. Locked from UI-SPEC Open Q #14.
- **D-19:** **Fit-to-view = reset-to-default** (`{x: 400, y: 180, k: 1}`) per CANV-05. Bbox-aware fit deferred to v2. Locked from UI-SPEC Open Q #15 + Phase 2 deferred.

### E. Search Palette UX

- **D-20:** **Search palette = 520px wide modal at `top: 120px`** (NOT vertically centered — keeps palette near typing eye-line, leaves canvas visible below). Width override of handoff 480px default; locked from `<user_decisions>` in UI-SPEC.
- **D-21:** **Result behavior = pure select + recenter (300ms tween) + toast `Centered on {name}`.** Does NOT auto-open the side panel (per SRCH-02 + UI-SPEC Open Q #5). User can double-click the now-selected node to open the panel. Recommended default; counter-argument (open the panel because user searched to edit) was considered and rejected for Phase 3.
- **D-22:** **Result row format = avatar + name (Inter 14px 600) + relation hint (mono 11px uppercase 0.06em).** Hint computed via BFS from `is_me` up to 4 hops — `PARENT · OF YOU`, `SPOUSE · OF ALICE`, `CHILD · OF YOU`, `SIBLING · OF YOU`, `SELF · YOU`, `RELATIVE` for distant. ~30 LOC of relation walking, lives in a pure function `lib/graph/relations.ts`.
- **D-23:** **Search palette includes the `is_me` person** labeled `SELF · YOU`. Disambiguates if multiple people share a first name; no harm in offering self-search. Locked from UI-SPEC Open Q #11.

### F. Inline-Undo Delete

- **D-24:** **Delete = optimistic delete on Remove click + immediate `temporal.pastStates.push` + toast `Removed {name} · Undo` (6000ms dwell).** No `window.confirm()` anywhere in Phase 3 code. The keyboard ⌘Z and the toast Undo button are equivalent — both call `temporal.undo()`. After the 6s dwell expires, the delete remains undoable via the normal undo stack indefinitely. Locked from UI-SPEC §6 + PANEL-07 final form.
- **D-25:** **Delete server-failure path** (optimistic-local rollback): if `removePerson` server action rejects BEFORE the inline-undo toast fires, pill on the would-be-deleted person flips red, SaveErrorToast `Couldn't remove {name}` (4400ms, Retry). Local state remains UNDELETED. Inline-undo toast NEVER appears in this path.
- **D-26:** **Self-delete attempt** (`person.is_me === true`): Remove button is hidden (Phase 2 PANEL-08 behavior, unchanged). No client/server check needed at delete time because the surface is never reached.

### G. Accessibility & Keyboard

- **D-27:** **Tab order = topbar → canvas section → toolbar → side panel** (when open). Locked from UI-SPEC §9 + A11Y-03. Toolbar wraps in `<div role="toolbar" aria-label="Canvas controls">` for SR landmark navigation. The disabled Tidy button is still tab-reachable with `aria-disabled="true"` so SR users hear "Tidy layout, dimmed".
- **D-28:** **Radial menu Tab vs arrow keys** = ship Tab cycle only in v1 (Parent → Spouse → Child → Sibling, Shift+Tab reverses). Arrow-key spatial nav (Up→Parent, Right→Spouse, Down→Child, Left→Sibling) deferred to a future polish pass. Tab cycling alone satisfies A11Y-01. Locked from UI-SPEC Open Q #4.
- **D-29:** **Reduced motion**: radial scale-in → instant; toast slide-in → instant; modal popIn → instant; recenter-on-search-pick canvas pan → instant. The 6s inline-undo dwell is NOT a motion property — remains 6000ms regardless of `prefers-reduced-motion`. Locked from UI-SPEC §Motion + global `prefers-reduced-motion` rule from `app/globals.css`.

### Claude's Discretion

- **D-30:** **Plan count.** Planner determines how many `*-PLAN.md` files Phase 3 becomes. Coarse granularity per ROADMAP.md (1-3 plans expected). Natural splits: (1) radial menu + add-relative pipeline + collision-nudge utility, (2) zundo wiring + history replay + toolbar + generic toast infra, (3) search palette + inline-undo Delete + a11y sweep. Planner may merge or split further.
- **D-31:** **Component decomposition** within each new surface (RadialMenu sub-components, Toolbar internal grouping, SearchPalette result list virtualization threshold). UI-SPEC §Component Inventory provides the recommended files; planner can adjust internal structure.
- **D-32:** **zundo `partialize` exact API surface** — UI-SPEC §3 specifies the exclusion list; planner verifies against zundo 2.x docs (`limit`, `partialize`, `equality: shallow`, `pause()` / `resume()` for drag coalescing). Researcher must confirm the `pause()` / `resume()` pattern works in zundo 2.x — if not, fall back to a `partialize` skip-pattern.
- **D-33:** **Replay routing (D-06)** — useSaveQueue vs direct Server Actions. Recommended through-queue, but planner has the final call after reading both code paths.
- **D-34:** **Removed-person record stash (D-05)** — zundo pastStates via partialize vs side cache vs server soft-delete. Recommended pastStates; planner final.
- **D-35:** **Optimistic-vs-buffered Add failure UX (D-12)** — recommended optimistic-first; planner final.
- **D-36:** **Toolbar tooltips** — `aria-label` only in v1 (no visible hover tooltip styled). Planner may use `title` attribute for browser-default tooltip if cheap; styled tooltip is v2.
- **D-37:** **Modal `top: 120px` clamping on small viewports** — UI-SPEC Open Q #13 flags that 120px + 60vh max-height can push the modal below a 600px viewport. Planner may clamp `top` to `min(120px, max(20px, vh * 0.15))` if it's a one-line CSS change; otherwise defer to v2.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 Specification (HIGHEST PRIORITY — locked design contract)

- `.planning/phases/03-authoring-history/03-UI-SPEC.md` — **Phase 3 visual + interaction contract; status `approved` 2026-04-29 revision 1.** Locks the radial menu, toolbar, search palette, inline-undo delete, generic toast infra, undo/redo via zundo (100-entry cap, partialize exclusions, drag-pause pattern), keyboard interaction matrix (8 sections), Tab order, accessibility contract (10 sub-rules), motion budget (no new curves), pixel-parity checklist (handoff sources), and 15 Open Questions with defensible defaults. Every implementation decision in `<decisions>` is grounded in or extends this spec — read this BEFORE drafting any plan.
- `.planning/REQUIREMENTS.md` — REQ-IDs in Phase 3 scope: RAD-01..03, ADD-01..04, HIST-01..05, TOOL-01..02, TOAST-01, SRCH-01..02, A11Y-01..03, PANEL-07. Note: TOOL-01 says `16px radius` — UI-SPEC Open Q #1 + Phase 2 grid-typo precedent treats this as a transcription error; ship 0px corners.
- `.planning/ROADMAP.md` §Phase 3 — goal, success criteria, requirement mapping, dependency on Phase 2.
- `.planning/PROJECT.md` — tech stack constraints (Zustand 5 + zundo 2.3 + immer 11; React Hook Form 7 + Zod 4; lucide-react 1.8; nanoid 5; Server Actions; Tailwind v4 `@theme`; React 19 / Next 16 / Clerk 7 / Supabase native third-party auth; RLS via `auth.jwt()->>'sub'`).

### Design Source of Truth (pixel-parity is non-negotiable per DESIGN-01..03)

- `design_handoff_family_tree/source/styles.css` — handoff `:root` CSS variables; Tailwind v4 `@theme` block in `app/globals.css` maps these 1:1. Phase 3 introduces ZERO new tokens (uses `--accent-soft` from existing root vars).
- `design_handoff_family_tree/source/components.jsx` — handoff React component reference. Phase 3 specific lines: `.radial` + `.radial-btn` L237-273 (radial geometry), `.toolbar` + `.toolbar-btn` L334-365 (toolbar pill), `.modal` + `.modal-backdrop` L408-450 (search palette modal), `.toast` L544-560 + `@keyframes toastIn` L557-560 (toast pattern).
- `design_handoff_family_tree/source/App.jsx` — handoff App reference. Phase 3 inherits the pan/zoom/drag handler implementations from Phase 2's adaptation.
- `design_handoff_family_tree/source/model.jsx` — handoff `computeEdges` already ported to `lib/graph/edges.ts` in Phase 2. Reference for relation-walking semantics if needed during D-22 search hint implementation.
- `design_handoff_family_tree/README.md` — handoff usage notes.

### Phase 2 Carryover (extend, do not duplicate)

- `.planning/phases/02-canvas-nodes-edit/02-CONTEXT.md` — Phase 2 implementation decisions, especially D-01..D-16 (Server Actions, optimistic-update pattern, useSaveQueue per-person serial queue, store shape, drag/edit zundo deferral via D-06 — Phase 3 reverses D-06).
- `.planning/phases/02-canvas-nodes-edit/02-UI-SPEC.md` — Phase 2 UI tokens Phase 3 inherits.
- `.planning/phases/02-canvas-nodes-edit/02-03-SUMMARY.md` — final Phase 2 plan summary; documents `useSaveQueue` + `<SidePanel>` + `<SaveErrorToast>` shipped state.
- `.planning/phases/02-canvas-nodes-edit/02-VERIFICATION.md` — Phase 2 verification report (`human_needed`); 10 HUMAN-UAT items pending — most unblocked by Phase 3's add-relative loop.
- `.planning/phases/02-canvas-nodes-edit/02-HUMAN-UAT.md` — UAT checklist; do NOT attempt to clear during Phase 3 implementation.
- `.planning/phases/02-canvas-nodes-edit/02-REVIEW.md` — Phase 2 code-review findings (6 warnings, 0 critical). Out of scope for Phase 3; separate `/gsd-code-review-fix 02` run.
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 store-factory pattern + RSC pattern; both still authoritative.
- `.planning/STATE.md` — current project state.
- `.planning/HANDOFF.md` — 2026-04-22 session handoff with the Phase 2 boundary lesson (passing tests ≠ user-visible value).

### Existing Code (Phase 3 extends or replaces)

- `lib/store/tree-store.ts` — Zustand store factory + `TreeStoreProvider`; already wraps with `temporal()` (Phase 1) but no past-states pushed yet (Phase 2 D-06). **Phase 3 wires `temporal({ limit: 100, partialize, equality: shallow })`** + adds slice fields `radialOpenFor`, `searchOpen`, `searchQuery`, `toasts` and actions `setRadialOpenFor`, `setSearchOpen`, `setSearchQuery`, `pushToast`, `dismissToast`. **Do NOT** call `createTreeStore()` at module scope.
- `lib/hooks/useSaveQueue.ts` — Phase 2's per-person serial save queue. **Phase 3 may route inverse Server Actions through this queue (D-06) — planner's call.**
- `app/actions/people.ts` — Phase 2 Server Actions: `updatePerson`, `movePerson`, `removePerson`. **Phase 3 adds `addPerson(treeId, kind, anchorId, position)`** following the same pattern (`'use server'`, `getUserIdOrThrow`, `supabaseServer`, RLS-trusted, error-wrap with prefixed message). Atomic txn for symmetric relationship patches (D-09).
- `components/canvas/PersonNode.tsx` L117-119 — `onPlusClick` currently logs `[Phase 3] radial open for {id}`. **Replace with `setRadialOpenFor(personId)`.** Keep the `+` button geometry (28×28 accent square at `bottom: -14px`, `left: 50%`, `translateX(-50%)`) — radial menu anchors off the same point.
- `components/canvas/SidePanel.tsx` L162-189 — `handleRemove` uses `window.confirm("Remove {name}…")`. **Drop `window.confirm`.** Optimistic delete → `temporal.pastStates.push` → fire toast with Undo action.
- `components/canvas/SaveErrorToast.tsx` — bespoke single-purpose toast. **Refactor into a publisher hook (`useSaveErrorToast`)** that pushes to the new generic `<ToastHost>` (D-15).
- `components/canvas/PanZoomWrapper.tsx` — Phase 2 drag-save commits server-side on mouseup. **Wrap the drag gesture in `temporal.pause()` / `resume()`** so ONE pastState push captures the pre-drag→post-drag delta (D-07 + UI-SPEC §3 implementation note).
- `app/(app)/tree/[treeId]/page.tsx` — Phase 1+2 RSC fetches `tree + people` under RLS. Phase 3 may need to extend the SELECT to surface anything new (no new columns expected — `pronouns` already shipped Phase 2).
- `app/globals.css` — Tailwind v4 `@theme` block. Phase 3 introduces ZERO new tokens; `--accent-soft` already exists from handoff.
- `lib/utils/cn.ts` — `cn()` className joiner (clsx + tailwind-merge). Use for radial / toolbar / toast variants.
- `lib/utils/hashUserId.ts` — `initialsFromName(name)`. Reused by search-palette result-row avatar.

### Project + Tooling Conventions

- `CLAUDE.md` — project instructions; tech stack constraints + GSD workflow enforcement.
- `package.json` — installed deps. **Phase 3 adds zero dependencies** (zustand, zundo, immer, lucide-react, nanoid, react-hot-toast NOT used per UI-SPEC; toast infra hand-rolled).
- `vitest.config.ts` — unit test runner. Phase 3 unit tests: `collisionNudge` (placement), relation walker (search hint), history-replay diff, toast queue ordering.
- `playwright.config.ts` — E2E test runner. Phase 3 E2E: the full demo path (sign in → add Parent → add Child → ⌘Z → ⌘⇧Z → drag → ⌘Z → ⌘K search → Enter → Remove → toast Undo).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phase 1 + 2)

- **`lib/store/tree-store.ts`** — Zustand store factory + Provider + `temporal()` wrapper (Phase 1). Phase 3 wires `temporal({ limit: 100, partialize, equality: shallow })` and adds slice fields + actions per D-15. Never module-scoped.
- **`lib/hooks/useSaveQueue.ts`** — per-person serial save queue (Phase 2). May host inverse-Server-Action replay calls (D-06).
- **`app/actions/people.ts`** — `updatePerson`, `movePerson`, `removePerson` (Phase 2). Add `addPerson` following the same pattern (D-09).
- **`components/canvas/PersonNode.tsx`** — 180×76 card with `+` button (Phase 2). Onclick handler is the radial-open trigger (D-15 / UI-SPEC §1).
- **`components/canvas/SidePanel.tsx`** — 380px right-docked panel with field primitives + Remove button (Phase 2). `handleRemove` is the inline-undo entry point (D-24).
- **`components/canvas/SaveErrorToast.tsx`** — refactored into `useSaveErrorToast` publisher hook (D-15).
- **`components/canvas/PanZoomWrapper.tsx`** — drag handler wraps in `temporal.pause()` / `resume()` (D-07).
- **`components/canvas/EdgeLayer.tsx`** — single SVG with `non-scaling-stroke` (Phase 2). Reused unchanged. New nodes appear in `people[]`; edges re-derive automatically.
- **`components/canvas/AvatarCircle.tsx`** — 40px avatar with mono initials (Phase 2). Reused by search-palette result rows.
- **`lib/graph/edges.ts`** — `computeEdges(peopleArray)` ported from handoff (Phase 2). Reused unchanged.
- **`lib/utils/cn.ts`**, **`lib/utils/hashUserId.ts`** — utility helpers.
- **`app/globals.css` `@theme` block** — handoff CSS variables. Phase 3 consumes `--accent-soft` (already present, Phase 2 unused).

### Established Patterns

- **Server Action mutation pattern** — `'use server'` + `getUserIdOrThrow()` + `supabaseServer()` + RLS-trusted call + error-wrap. Phase 3 mirrors for `addPerson`.
- **Store factory + Provider** — never module-scoped; one store per `<TreeStoreProvider>` instance. Selectors via `useTreeStore(s => s.x)` or `useShallow` for object selectors. Phase 3 follows.
- **Tailwind v4 with handoff tokens** — all colors come from `@theme` CSS variables. NO hard-coded OKLCH in components.
- **Optimistic-local + server reconcile** — Phase 2's drag-save and field-edit pattern. Phase 3 extends to add-relative (D-12) and remove-person (D-24).
- **Per-person serial save queue** — Phase 2's `useSaveQueue` covers field saves and drag saves. Phase 3 may extend to inverse Server Actions for undo/redo (D-06).
- **No JSX in `.ts` files** — `lib/store/tree-store.ts` uses `React.createElement`. Phase 3 plumbing in `.ts`, components in `.tsx`.
- **`useShallow` for object/array selectors** — established by quick-task 260422-9vu after Phase 2 shipped. Mandatory for any selector returning an object or array.
- **Inline error fallbacks** — RSCs return `<AuthError variant="..." />` on auth/RLS failures rather than throwing. Phase 3 RSC extensions follow.

### Integration Points

- **`components/canvas/PersonNode.tsx` L117-119** — `onPlusClick` console.info log → `setRadialOpenFor(personId)` Zustand action.
- **`components/canvas/SidePanel.tsx` L162-189** — `handleRemove` `window.confirm` → optimistic delete + `temporal.pastStates.push` + `pushToast({ kind: 'info', message: 'Removed {name}', action: { label: 'Undo', onAction: () => temporal.undo() }, dwellMs: 6000, ariaRole: 'status', ariaLive: 'polite' })`.
- **`components/canvas/PanZoomWrapper.tsx` drag handlers** — wrap mousedown→mouseup in `temporal.pause()` / `resume()` so one pastState push captures the gesture (D-07).
- **`lib/store/tree-store.ts` `temporal()` config** — wire `{ limit: 100, partialize, equality: shallow }` per D-07. Add slice fields per D-15.
- **`app/actions/people.ts`** — add `addPerson(treeId, kind, anchorId, position)` per D-09.
- **TreeCanvas root keyboard listener** — single mounted listener checks `document.activeElement` before dispatching ⌘Z, ⌘⇧Z, ⌘Y, ⌘K, ⌘F (D-08).
- **TreeCanvas root** — mount `<RadialMenu>` (when `radialOpenFor != null`), `<Toolbar>` (always, with disabled states from store), `<SearchPalette>` (when `searchOpen`), `<ToastHost>` (always).

### Constraints From Existing Code

- **Topbar height is 52px** (locked from Phase 1). Side panel `top: 52px`. Radial menu anchors off PersonNode `+` button center, NOT viewport.
- **`temporal()` wrapper present but unwired** — Phase 2 D-06 explicitly deferred. Phase 3 reverses this; ensure no Phase 2 code paths break when zundo starts pushing pastStates.
- **`Database` generic type** — `lib/supabase/types.ts` already has `pronouns` from Phase 2 migration. No new schema changes expected in Phase 3.
- **macOS case-insensitive filesystem quirk** — `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree` (uppercase C) and `/Users/davezabihaylo/Documents/claudecode/czfamtree` (lowercase) resolve to the same directory. Worktree isolation falls back to sequential under the uppercase path.
- **React 19 async transitions** — `router.refresh()` inside an async `startTransition` leaves the transition pending forever (lesson from quick-task 260422-9vu). Avoid this pattern in any new navigation code.

</code_context>

<specifics>
## Specific Ideas

- **Demo path verification:** Phase 3 'complete' requires Playwright E2E walking the demo path AND a manual smoke pass. Vitest covers pure utilities (collisionNudge, relation walker, history-replay diff, toast queue ordering). Both green = Phase 3 done.
- **Radial menu visual constants** (UI-SPEC §Spacing): 140px container, 56×56 buttons at 90px radius from center, mono 18px symbols (↑↔↓←), mono 11px uppercase labels, `--accent-soft` hover/focus background per RAD-02.
- **Toolbar layout**: `[Undo][Redo][÷][Zoom-][k%][Zoom+][Fit][÷][Tidy][Panel]` = 342px total, bottom-center, no horizontal padding. Tab order matches DOM left-to-right.
- **Toast inventory** (UI-SPEC §Generic Toast Inventory): save error 4400ms `alert/assertive`; add success 2200ms `status/polite`; center confirmation 2200ms; inline-undo delete 6000ms; tidy success 2200ms (Phase 4 publisher).
- **Search palette modal**: 520px wide × `top: 120px`, max result list height `min(60vh, 400px)`, result rows 56px tall (40px avatar + 8px vertical padding × 2). Auto-focused input. Esc dismisses; restores prior focus.
- **Inline-undo delete copy**: `Removed {name}` (left) · `Undo` (right, accent text 600 weight). 6000ms dwell. ⌘Z within window OR Undo click OR expiry-then-toolbar-Undo all reach the same `temporal.undo()`.
- **Add-relative confirmation toasts** (2200ms, no Undo button — undo via ⌘Z): `Added parent · {anchor name}`, `Added spouse · {anchor name}`, `Added child · {anchor name}`, `Added sibling · {anchor name}`.
- **Add-relative failure toast**: `Couldn't add {kind} · {anchor name}` (4400ms, Retry). Cycle prevention failure: `Couldn't add {kind} — would create a cycle`. Parent-cap failure: `Couldn't add parent — already has two`.
- **Server action signature**: `addPerson(treeId: string, kind: 'parent' | 'spouse' | 'child' | 'sibling', anchorId: string, position: { x: number, y: number }): Promise<{ id: string, ...person fields }>`. Atomic txn for symmetric relationship patches.
- **`temporal()` config (locked from UI-SPEC §3)**: `{ limit: 100, partialize: (state) => ({ people: state.people }), equality: shallow }`. Drag uses `pause()` / `resume()` bracket; verify against zundo 2.x docs at plan time.
- **Keyboard listener pattern**: single `useEffect` at TreeCanvas root, `document.activeElement` check for `INPUT | TEXTAREA | [contenteditable=true]`, dispatches ⌘Z, ⌘⇧Z, ⌘Y, ⌘K, ⌘F. ⌘F calls `e.preventDefault()` to suppress browser Find-in-page when canvas owns focus.
- **Relation walker** (`lib/graph/relations.ts`): pure function `relationFrom(people: Record<id, Person>, fromId: PersonId, toId: PersonId): RelationHint`. BFS up to 4 hops; returns `{kind: 'self' | 'parent' | 'spouse' | 'child' | 'sibling' | 'relative', qualifier?: string}`. Vitest unit tests: self, direct relation, in-law, no-relation.
- **Collision-nudge** (`lib/graph/placement.ts`): pure function `nudgePosition(initial: {x,y}, people: Record<id,Person>, opts?: {step, maxIter}): {x,y}`. `NODE_W = 180`, `NODE_H = 76`, collision radius `NODE_W + 32 = 212`, nudge step `NODE_H + 16 = 92`, max 20 iter. Vitest unit tests: empty, single occupied row, deep chain, max-iter fallback.

</specifics>

<deferred>
## Deferred Ideas

(Tracked so they aren't lost — none of these belong in Phase 3.)

- **Bbox-aware Fit-to-view** — v2; Phase 3 ships CANV-05 reset-to-default per D-19.
- **Visible toolbar tooltip on hover (styled)** — v2; Phase 3 uses `aria-label` (and possibly `title`) only per D-36.
- **Per-node arrow-key traversal** — v2 per PROJECT.md; Phase 3 keeps single canvas tabIndex.
- **Radial arrow-key spatial nav** — v2; Phase 3 ships Tab cycle only per D-28.
- **`aria-keyshortcuts` attributes** — v2 per UI-SPEC accessibility section; SR support inconsistent.
- **Visible Find-in-page UI distinct from search palette** — out of v1 scope; ⌘F opens search palette per UI-SPEC §5.
- **Granular intra-textarea undo at canvas level** — out of scope; native textarea undo handles this when focus is in the field per D-08 + UI-SPEC Open Q #10.
- **Modal `top: 120px` clamping for small viewports** — v2 polish per D-37 + UI-SPEC Open Q #13.
- **Right-click context menu (RICH-02)** — v2 per UI-SPEC out-of-scope list.
- **Photo upload, GEDCOM import/export** — not in v1 per PROJECT.md.
- **Soft-delete column on `people` (`deleted_at`)** — out of scope per D-05; zundo pastStates handles restore for v1.
- **Phase 2 code-review fixes (6 warnings)** — separate `/gsd-code-review-fix 02` run; do NOT fold into Phase 3.
- **Phase 2 HUMAN-UAT (10 items)** — unblocked BY Phase 3's add-relative loop; verify after Phase 3 ships.
- **`react-hot-toast` dependency** — UI-SPEC reaffirms hand-rolled toast infra; do NOT add this dep.
- **Bespoke `<ConfirmRemoveDialog>` styled modal** — removed permanently from the component inventory per D-24; inline-undo subsumes it.
- **Search palette auto-opens side panel on result selection** — rejected per D-21 + UI-SPEC Open Q #5.
- **Tidy / dagre layout** — Phase 4; toolbar Tidy button is visible-disabled placeholder per D-18.
- **Share modal + invites + Realtime presence + cursors** — Phase 5; Phase 3's `<Modal>` primitive is the foundation Share will reuse.
- **Animated sidebar/canvas resize on panel toggle** — out of scope; toggle is instant per Phase 2 motion budget.

</deferred>

---

*Phase: 03-authoring-history*
*Context gathered: 2026-04-29 → 2026-05-07 (resumed)*
