# Session Handoff — 2026-05-08

**Read this first in the next session before running any command.**

## Where things stand

- **Phase 3 (Authoring & History): planned and committed.** 4 PLAN.md files across 4 strictly-sequential waves. Plan-checker passed iteration 2/2 (one revision round). All 20 phase requirement IDs covered, all 37 CONTEXT.md decisions covered. Working tree clean.
- **Phase 2:** code-complete and committed. Automated verification passes. HUMAN-UAT (10 items) still pending — blocked on Phase 3 radial-add shipping (most UAT items need 2+ people in a tree).
- **Phase 1:** complete.
- **Branch:** `main`, pushed to `origin/main` at handoff time. No uncommitted work.

## Next action (exact command to run)

```
/clear
/gsd-execute-phase 3
```

`/gsd-execute-phase` runs all 4 waves sequentially, committing per task. Local supabase must be running (`supabase status` first; `supabase start` if needed) — Plan 01 Task 2 runs `npx supabase db push` automatically as part of its action.

After execution:

```
/gsd-verify-work 3
```

This walks the Playwright demo-path E2E + the 5 ROADMAP success criteria.

## Phase 3 plan summary

| Wave | Plan | Builds |
|------|------|--------|
| 1 | `03-01-PLAN.md` | `lib/graph/placement.ts` + `lib/graph/relations.ts` (with vitest), `addPerson` Server Action, SECURITY DEFINER RPC migration, `components/ui/Modal.tsx` |
| 2 | `03-02-PLAN.md` | `RadialMenu.tsx` (NEW), optimistic add-relative pipeline in `tree-store.ts`, `+`-button wiring in `PersonNode.tsx`, side-panel auto-focus on add |
| 3 | `03-03-PLAN.md` | zundo `temporal()` config (limit 100, partialize people-only), drag pause/resume bracket, `useSaveQueue.enqueueInverse`, `Toolbar.tsx` (NEW — 8 buttons with disabled states), generic `ToastHost.tsx` (NEW) |
| 4 | `03-04-PLAN.md` | `useTreeKeyboard.ts` (NEW — scope-gated ⌘Z/⌘⇧Z/⌘Y/⌘K/⌘F), `SearchPalette.tsx` (NEW), inline-undo Delete refactor (replaces `window.confirm()`), a11y sweep (focus rings, ARIA, Tab order topbar→canvas→toolbar→side panel), Playwright `phase-3-demo-path.spec.ts` |

The demo path Playwright E2E in Plan 04 Task 4 IS the success gate. Don't mark Phase 3 complete on type-check/build alone.

## Decisions made this session

1. **`addPerson` ships as a SECURITY DEFINER RPC** (not a two-write Server Action). Resolves CONTEXT.md D-09 atomicity + RESEARCH Q1.
2. **Strictly sequential 4-wave structure.** Plans 02 and 03 share `tree-store.ts` and `PanZoomWrapper.tsx` in non-overlapping regions. Plan-checker iteration 1 caught the parallel-wave race; fix is structural via `depends_on`, not prose.
3. **Modal small-viewport clamp implemented** (`clamp(20px, 15vh, 120px)`). Resolves RESEARCH Q4 inline rather than deferring.
4. **Remove-person undo ships local-only.** Server-side `restorePerson` deferred to Phase 5 as T-03-23. TODO comment planted in `useHistoryReplay`'s 'gone now' branch + `Known Debt → Phase 5` SUMMARY entry in Plan 04.
5. **Zero new npm packages.** Toast, search, modal, radial menu, keyboard layer all hand-rolled per UI-SPEC.

Full handoff context (anti-patterns, infra state, decisions): `.planning/phases/03-authoring-history/.continue-here.md`
Machine-readable: `.planning/HANDOFF.json`

## Blocking constraint when resuming

**Local supabase must be running before `/gsd-execute-phase 3` starts.** Plan 01 Task 2 runs `npx supabase db push` against the local instance. If supabase isn't up, Task 2 will fail mid-execute. Run `supabase status` first; `supabase start` if needed.

## Unfinished work (explicitly deferred, not forgotten)

### Phase 2 HUMAN-UAT — 10 items in `.planning/phases/02-canvas-nodes-edit/02-HUMAN-UAT.md`
All pending. Unlocks once Phase 3 ships radial-add and 2+ person trees are possible.

### Phase 2 code-review fixes — `02-REVIEW.md` (6 warnings, 0 critical)
Run `/gsd-code-review-fix 02` separately when ready. Do NOT mix with Phase 3 execution.

Top items:
- WR-01: literal `—` rendering as text in JSX children of SidePanel/SavePill/SaveErrorToast.
- WR-02: `SidePanel.handleRelationClick` Y-axis math sign error (~78px off-center).
- WR-03: `parseInt(v, 10)` on whitespace-only Born/Died input → NaN → Zod rejects.
- WR-05: window mousemove/mouseup/wheel effects re-register every pan frame.

### Next.js deprecation — `middleware.ts` → `proxy.ts` rename
Dev server logs `The "middleware" file convention is deprecated. Please use "proxy" instead.` Good `/gsd-quick` candidate or Phase 5 infra plan.

### Phase 5 known debt
- **T-03-23: server-side restorePerson Server Action.** When implemented, the inverse-Server-Action loop in Plan 03's `useHistoryReplay` 'gone now' branch will close. Source has a TODO comment referencing this handoff.

## Session commits (this session — Phase 3 planning pipeline)

```
f82aa76 docs(03): create phase plan — 4 plans across 4 waves
ff64c73 docs(03): research authoring & history domain
31113a6 docs(state): record phase 3 context session
903877b docs(03): capture phase context
3f2b67e docs(03): mark UI-SPEC approved
2a64f52 docs(03): UI-SPEC revision 1 — Typography 4 sizes / 2 weights + aria-label standardisation
4f77050 docs(phase-3): UI design contract
```

## Feedback to apply going forward (from prior sessions)

The user values direct, honest assessment over defensive progress framing. Two rules to honor:

1. **Measure "done" by what the user can actually do, not what tests pass.** A phase boundary that doesn't enable a usable user loop is a defect to flag *before* declaring completion. Phase 3's gate is the demo-path Playwright E2E specifically because Phase 2's gate was too lenient.
2. **Name boundary trade-offs explicitly** ("X is shipped local-only, Y is deferred to Phase Z") instead of celebrating commit counts. T-03-23 is the live example of this in Phase 3.
