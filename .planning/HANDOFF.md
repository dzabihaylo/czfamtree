# Session Handoff — 2026-04-22

**Read this first in the next session before running any command.**

## Where things stand

- **Phase 2 (Canvas, Nodes & Edit):** code-complete and committed. Automated verification passes (tsc 0, 16/3 vitest, build clean). HUMAN-UAT is **persisted but not executed** — blocked on Phase 3 radial-add shipping (most UAT items require 2+ people in a tree, which requires the ability to add a relative).
- **Phase 3 (Authoring & History):** planning pipeline paused. User chose "full pipeline" path. Next step is `/gsd-ui-phase 3` (UI-SPEC gate). Empty phase directory exists at `.planning/phases/03-authoring-history/`.
- **Working tree:** clean. Branch is `main`. 9 commits from this session (see "Session commits" below).

## Decisions made this session

1. **Phase 3 path choice: B — full pipeline.** The user explicitly chose `/gsd-ui-phase 3` → `/gsd-discuss-phase 3` → `/gsd-plan-phase 3` → `/gsd-execute-phase 3` over a split (3a unblocker + 3b polish). Honor this choice — do not re-litigate it next session.
2. **Phase 2 is being treated as complete for code purposes** even though HUMAN-UAT items are pending. This was a deliberate compromise because the UAT can't be exercised without Phase 3's add-relative loop.

## Next action (exact command to run)

```
/gsd-ui-phase 3
```

After it completes:

```
/gsd-discuss-phase 3
/gsd-plan-phase 3
/gsd-execute-phase 3
```

Do NOT try to chain these — `/gsd-ui-phase` and `/gsd-discuss-phase` use interactive TUI prompts that break inside nested invocations. Run them as top-level commands one at a time.

## Feedback from user about my approach (apply going forward)

The user was frustrated at the end of this session because Phase 2 shipped a "skeleton" — a canvas they could drag but couldn't add anyone to, with an undismissable "Getting Started" overlay and a `+` button wired to nothing. Their words: *"this doesn't feel like progress."*

**The root lesson:** passing automated verification is not the same as shipping user-visible value. Phase 2's boundary was badly drawn — it shipped infrastructure (canvas + save pipeline + side panel edit) without any trigger that makes the core product loop (add-relative) work.

**Apply in the next session:**

- If a phase boundary doesn't enable a usable user loop, flag it *before* declaring completion — not after. The verifier's `human_needed` UAT list should have tipped me off: most items required 2+ people to test, which wasn't possible from a fresh tree.
- Measure "done" by what the user can actually do, not what tests pass.
- Name boundary trade-offs explicitly ("Phase X is infrastructure-only; you won't be able to test feature Y until Phase X+1") instead of celebrating commit counts.
- The user responds well to direct, honest assessment — not defensive progress framing.

## Unfinished work (explicitly deferred, not forgotten)

### Phase 2 code-review findings — `/gsd-code-review-fix 02` when ready
`02-REVIEW.md` lists 6 warnings (0 critical). Most important:
- **WR-01 (user-visible):** literal `\u2014` rendering as text in JSX children of `SidePanel.tsx`, `SavePill.tsx`, `SaveErrorToast.tsx`. Escapes in JS string contexts (object/array values) work — only the JSX text usages are broken.
- **WR-02:** `SidePanel.handleRelationClick` Y-axis math adds TOPBAR_HEIGHT where it should subtract. "Center on this person" lands ~78px below screen center.
- **WR-03:** `parseInt(v, 10)` on whitespace-only Born/Died input returns NaN → Zod rejects → error pill.
- **WR-04:** `Math.min(...xs)` spread in EdgeLayer — fine at 200 nodes, harden before Phase 5.
- **WR-05:** window mousemove/mouseup/wheel effects re-register every pan frame (deps on `transform.x/y/k`) — fix with imperative `storeApi.getState()` reads.
- **WR-06:** toast dismissal reset key is `errorPersonId` (unchanged on re-error) — repeated failures for same person don't re-surface the toast.

### Phase 2 HUMAN-UAT — `.planning/phases/02-canvas-nodes-edit/02-HUMAN-UAT.md`
10 items, all pending. Unlocks once Phase 3 ships radial-add and 2+ person trees are possible.

### Next 16 deprecation warning — `middleware.ts` → `proxy.ts` rename
Dev server logs `The "middleware" file convention is deprecated. Please use "proxy" instead.` Not in Phase 2 scope. Good candidate for a `/gsd-quick` or a Phase 5 infra plan.

### Phase 3 pre-existing concerns (raise during `/gsd-discuss-phase 3`)
- **zundo limit:** PROJECT.md says 50 past states. Confirm this is what the user wants, and whether drag mid-move should coalesce into one history entry.
- **Cmd-Z inside inputs:** must be ignored when focus is in a text input or textarea (HIST-02 hint).
- **Radial menu exact angles:** design handoff has a reference at `design_handoff_family_tree/`. Confirm pixel-parity targets.
- **Delete confirmation UX:** Phase 2 uses `window.confirm()`. Phase 3 may want a styled modal or inline-undo.
- **`+` button currently logs `[Phase 3] radial open for {id}`:** wire this up in Phase 3, don't remove the log without replacing the behavior.
- **A11Y:** focus ring token, tab order (topbar → canvas → toolbar → side panel), ARIA labels on every interactive control (A11Y-01..03).

## Session commits (in order)

```
abaff7c docs(quick-260422-9vu): fix Zustand selector + TreeSwitcher hang + hydratePeople reset
0c9549c fix(quick-260422-9vu-03): reset selection/sidepanel/drag/save-status in hydratePeople
340d786 fix(quick-260422-9vu-02): drop router.refresh() from TreeSwitcher handleCreate
eb5ca59 fix(quick-260422-9vu-01): stabilise Zustand selectors to kill infinite render loop
e712bd4 test(02): persist human verification items as UAT
7ee1b8c docs(02): add code review report
366639f docs(02-03): complete save-pipeline + side-panel plan
52cba97 feat(02-03): SaveErrorToast + hoist useSaveQueue to canvas level
58577a2 feat(02-03): SidePanel + SavePill + RelationsList + TreeCanvas mount
535dc77 feat(02-03): field primitives (FieldInput + FieldTextarea + GenderSelect)
3ddfc56 feat(02-03): useSaveQueue hook with per-person serial queue
951bba7 docs(02-02): complete canvas-render plan
3e7900c feat(02-02): PersonNode 180x76 card with all visual states
718eab3 feat(02-02): PanZoomWrapper drag branches + movePerson persistence
d1acc60 feat(02-02): EdgeLayer single-SVG overlay + AvatarCircle 40px
d9f784d feat(02-02): TreeStoreProvider + TreeCanvas shell + PanZoomWrapper
d101b7f docs(02-01): complete canvas-data-plumbing plan
1bf7778 chore(02-01): Phase 2 CSS tokens + D-08 grooming
7550bb5 feat(02-01): extend Zustand store with Phase 2 slice
6d05521 feat(02-01): Server Actions for person mutations
6aec2b6 feat(02-01): Zod person schema + pure graph utilities
7415f7b test(02-01): add failing tests for edges + person schema
61f97a1 docs(phase-02): commit Phase 2 plans before execution
```

## Local dev environment reminder

- `.env.local` already has Clerk + Supabase keys set.
- Supabase is a *remote* project — migrations at `supabase/migrations/20260421000000_initial_schema.sql` must be pushed via `npx supabase db push` (may need `npx supabase link --project-ref <ref>` first).
- `npm run dev` starts Turbopack on port 3000. Dev indicator "rendering" persisting with a spinning cursor = likely a pending React 19 async transition (the bug that was fixed this session in TreeSwitcher; if it returns, look for another async `startTransition` with `router.refresh()` or similar).
- macOS case-insensitive filesystem quirk: `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree` (uppercase C) and `/Users/davezabihaylo/Documents/claudecode/czfamtree` (lowercase) resolve to the same directory. `Agent` worktree isolation fails under the uppercase variant — fall back to sequential execution if worktree creation errors out.

## Don't do next session

- Don't try to "finalize" Phase 2 by checking off HUMAN-UAT items until Phase 3 ships radial-add. You will be unable to create a multi-person tree to test with.
- Don't auto-advance chains through `/gsd-ui-phase` → `/gsd-discuss-phase` → `/gsd-plan-phase`. TUI prompts break inside nested Task calls. Run them sequentially at the top level.
- Don't fix the 6 code-review warnings in the same session as Phase 3 planning — they're polish, keep them separate. `/gsd-code-review-fix 02` is the right entry point when ready.
