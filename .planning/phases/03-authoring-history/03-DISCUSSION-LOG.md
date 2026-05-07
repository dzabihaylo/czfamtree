# Phase 3: Authoring & History - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29 → 2026-05-07 (resumed across two sessions; checkpoint bridged the gap)
**Phase:** 03-authoring-history
**Areas discussed:** Phase boundary + demo path · Undo/redo server-sync model · Add-relative pipeline + error UX

---

## Phase boundary + demo path (Session 1, 2026-04-29 — pre-pause)

This area was resolved in the first session before the pause; recreated from `03-DISCUSS-CHECKPOINT.json`.

### Demo path

**User's choice:** Full radial + history + search demo path:
sign in → select You → `+` → Parent → name → `+` → Child → name → ⌘Z (reverts each step) → ⌘⇧Z (replays) → drag a node → ⌘Z (one entry) → ⌘K → search → Enter → centers → Remove on side panel → toast `Removed X · Undo` → click Undo.

**Verification gate:** Playwright E2E walking the demo path + manual smoke pass + Vitest for pure utils. Phase 'complete' = both green.

### Out of scope (locked)

- Tidy / dagre layout itself (Phase 4 — button visible-but-disabled in P3).
- Share modal / Realtime / cursors (Phase 5 — `<Modal>` primitive ships in P3 for search; Share reuses).
- Phase 2 code-review fixes — separate `/gsd-code-review-fix 02` run, NOT folded into Phase 3.
- Photo upload / right-click context menu / arrow-key traversal — v2.

### Boundary decision policy

**User's choice:** Flag and present trade-offs to user; don't auto-decide. (Lesson from Phase 2 boundary feedback: passing tests ≠ shipping a usable user loop.)

---

## Undo/redo server-sync model

### Replay model (Session 1)

Resolved in Session 1 before the pause; checkpoint preserved the answer.

**User's choice:** Replay inverse Server Actions per affected person — zundo restores Zustand; effect diffs prior↔next people Map and fires per-person Server Actions:
- `addPerson` ↔ `removePerson(id)`
- `removePerson` ↔ `addPerson(id, fullRecord)`
- field edit ↔ `updatePerson(id, prevFields)`
- drag ↔ `movePerson(id, prevX, prevY)`

Per-person error toasts on rejection.

### Failure UX when an inverse Server Action rejects (Session 2)

| Option | Description | Selected |
|--------|-------------|----------|
| Accept UI-SPEC default (optimistic revert + red pill + Retry toast) | Local zundo state DOES revert (so user sees the ⌘Z land); per-person pill flips red; one toast `Couldn't sync history` (4400ms) with Retry button. Matches Phase 2 SAVE error pattern. Lowest UX friction. | ✓ |
| Roll back the undo (revert the revert) | If server rejects the inverse action, push user back to post-action state. More 'consistent' with server but jarring — user pressed ⌘Z and saw the change disappear, then watched it come back. | |
| Silent background retry, no toast unless persistent | Queue inverse actions in useSaveQueue with retry; only surface UI after N failures. Less noise; risk of stale local state. | |

**User's choice:** Accept UI-SPEC default (optimistic revert + red pill + Retry toast).
**Notes:** The in-flight question from the paused session. UI-SPEC §3 had drafted this default during the session gap; user confirmed.

### Replay routing — through useSaveQueue or direct? (Session 2)

| Option | Description | Selected |
|--------|-------------|----------|
| Through useSaveQueue | Inverse actions go through Phase 2's per-person serial queue. Guarantees no overlap with in-flight field-edit saves. Pill lifecycle consistent. Slightly more wiring. | |
| Direct Server Actions, parallel | Skip queue; fire inverse actions directly. Simpler; concurrent field edit + undo for same person could race (last-write-wins on server, pill state machine could glitch). | |
| You decide | Planner picks during `/gsd-plan-phase 3`. Both viable. | ✓ |

**User's choice:** You decide (Claude's discretion → planner).
**Notes:** Recommendation captured in CONTEXT.md D-06: through useSaveQueue. Final call lands in PLAN.md.

### How is a removed person's full record stashed for restore? (Session 2)

| Option | Description | Selected |
|--------|-------------|----------|
| zundo pastStates carries it via `partialize: { people }` | Since partialize snapshots entire `people` map, removed person's record is in prior pastState. Undo restores by diffing prior↔next. No side cache needed. Aligned with UI-SPEC partialize config. | |
| Side cache keyed by personId | Maintain separate `removedPeople: Record<id, FullRecord>` outside zundo. Useful if partialize ever shrinks for memory. Adds a code path zundo doesn't drive. | |
| Server replay (re-fetch from soft-delete row) | Soft-delete row server-side (`deleted_at` column) and let undo re-fetch. Schema change required (new column + RLS edit). Heavier than v1 needs. | |
| You decide | Planner picks during `/gsd-plan-phase 3`. | ✓ |

**User's choice:** You decide (Claude's discretion → planner).
**Notes:** Recommendation captured in CONTEXT.md D-05: zundo pastStates via partialize. No schema changes for v1.

---

## Add-relative pipeline + error UX

### Add-relative server failure UX — UI-SPEC #9

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic-first (appear-then-vanish on error) | Matches Phase 2's optimistic-local + reconcile pattern. User gets immediate feedback. Brief flash on rare failure path is acceptable noise. | |
| Buffered until ACK | Don't render new node until server responds. No flash on failure, but adds 200-500ms latency on the happy path — hurts the 'effortless' Phase 3 feel. | |
| Optimistic with shimmer/dim until ACK | Render at reduced opacity until ACK, then fade to full. Communicates 'pending' visually. Adds CSS state. | |
| You decide | Planner picks. | ✓ |

**User's choice:** You decide (Claude's discretion → planner).
**Notes:** Recommendation captured in CONTEXT.md D-12: optimistic-first per Phase 2 pattern.

### Server action shape

| Option | Description | Selected |
|--------|-------------|----------|
| Single `addPerson(treeId, kind, anchorId, position)` | One Server Action does symmetric patches (e.g. spouse: writes a.spouseIds += [b] AND b.spouseIds += [a] in one txn). Atomic, one round-trip. Locked by UI-SPEC §2. | ✓ |
| Composed (createPerson + updatePerson on anchor) | Two Server Actions wrapped client-side. Loses transactional atomicity — network blip mid-call leaves anchor un-patched while new person exists. | |

**User's choice:** Single `addPerson(treeId, kind, anchorId, position)`.
**Notes:** Locked. CONTEXT.md D-09.

### Parent-cap edge case (DATA-06: max 2 parents)

| Option | Description | Selected |
|--------|-------------|----------|
| Server rejects, SaveErrorToast `Couldn't add parent — already has two` | Trust the server. Radial Parent button always clickable; rejection drives toast. Simplest code path; covers the rare edge case. UI-SPEC §2 default. | ✓ |
| Pre-disable the radial Parent button at 2 parents | Compute `anchor.parentIds.length >= 2` client-side and render disabled. Slightly better UX (no error after click) but adds client logic mirroring server invariants. | |
| Hide the radial Parent button at 2 parents | Slice disappears entirely. Looks like radial menu is broken (only 3 buttons). | |

**User's choice:** Server rejects + SaveErrorToast.
**Notes:** Locked. CONTEXT.md D-10.

---

## Claude's Discretion (planner picks during `/gsd-plan-phase 3`)

- **D-05 — Removed-person record stash mechanism.** Recommended: zundo pastStates via `partialize: { people }`.
- **D-06 — Replay routing for undo/redo inverse actions.** Recommended: through `useSaveQueue` for serial-per-person consistency.
- **D-12 — Add-relative optimistic vs buffered failure UX.** Recommended: optimistic-first per Phase 2 pattern.
- **D-30 — Plan count.** Coarse granularity; expected 1-3 PLAN.md files.
- **D-31 — Component decomposition** within new surfaces (RadialMenu sub-components, Toolbar grouping, SearchPalette result list virtualization).
- **D-32 — zundo `partialize` exact API surface verification** against zundo 2.x docs (especially `pause()` / `resume()` for drag coalescing).
- **D-36 — Toolbar tooltip implementation** (`aria-label` only required; `title` attribute optional).
- **D-37 — Modal `top: 120px` clamping** for small viewports (UI-SPEC Open Q #13).

---

## Deferred Ideas

(Captured during discussion; do not belong in Phase 3.)

- **Bbox-aware Fit-to-view** — v2.
- **Visible toolbar tooltip styling on hover** — v2.
- **Per-node arrow-key traversal** — v2 per PROJECT.md.
- **Radial arrow-key spatial nav** — v2 (Tab cycle only in v1).
- **`aria-keyshortcuts` attributes** — v2 (inconsistent SR support).
- **Granular intra-textarea undo at canvas level** — native textarea undo covers it.
- **Soft-delete column on `people`** — out of v1 scope.
- **Modal `top` clamp for small viewports** — v2 polish.
- **Right-click context menu (RICH-02)** — v2.
- **Photo upload, GEDCOM import/export** — not in v1.
- **`react-hot-toast` dependency** — hand-rolled toast infra reaffirmed.
- **Bespoke `<ConfirmRemoveDialog>` styled modal** — subsumed by inline-undo, removed permanently.
- **Search palette auto-opens side panel** — rejected.
- **Tidy / dagre layout** — Phase 4 (button visible-disabled placeholder in P3).
- **Share modal + invites + Realtime presence + cursors** — Phase 5.

---

## Session continuity note

Discussion was paused mid-Area 2 at the in-flight question "What should happen when an inverse Server Action rejects?" on 2026-04-29. During the gap, the UI-SPEC was authored, reviewed, revised once (Typography + aria-label fixes), and approved. UI-SPEC §3 drafted defaults for the in-flight question and several Area 3 sub-questions. On resume 2026-05-07, the user confirmed UI-SPEC's failure-UX default verbatim and deferred two Area-2 sub-questions plus one Area-3 sub-question to planner discretion. Three Area-3 questions resolved in one batch (locked, locked, deferred-to-planner-with-recommendation).
