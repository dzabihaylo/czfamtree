---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-21T19:45:59.087Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
  percent: 100
---

# STATE: CZ Family Tree

**Last updated:** 2026-04-21 (after plan 01-04 execution — Phase 1 COMPLETE)

## Project Reference

- **Name:** CZ Family Tree (czfamtree)
- **Core value:** A person opens the app, sees their family on a clean canvas, and adds/edits relatives without friction. The canvas + radial-add loop must feel effortless.
- **Current focus:** Phase 01 — foundation
- **Planning root:** `.planning/`

## Current Position

Phase: 01 (foundation) — COMPLETE
Plan: 4 of 4 complete. Phase 1 ready for verification.

- **Milestone:** v1 Launch
- **Phase:** 01 — Foundation (complete, awaiting verifier)
- **Plan:** 01-01 + 01-02 + 01-03 + 01-04 complete (scaffold + Clerk + Supabase + tokens + Zustand + cloud-applied schema + RLS + typed Database generic + Clerk sign-in/sign-up pages + split-50/50 auth shell + decorative SVG + bootstrap server action + root redirect + authenticated shell with 52px topbar + inline tree rename + tree switcher + user menu with Sign out + `/tree/[treeId]` RSC with RLS-gated reads + seed YOU node + empty overlay + AuthError fallback + Playwright E2E env-gated)
- **Status:** Phase 01 COMPLETE — ready for verification
- **Progress:** [██████████] 100%

### Roadmap Overview

| Phase | Goal | Status |
|-------|------|--------|
| 1. Foundation | Signed-in user lands in own private tree with schema + RLS correct | Complete (4/4 plans done — awaiting verification) |
| 2. Canvas, Nodes & Edit | Pan/zoom canvas, PersonNode, SidePanel, trustworthy auto-save | Not started |
| 3. Authoring & History | Radial-add, undo/redo, toolbar, toasts, search, a11y | Not started |
| 4. Tidy & Layout | Dagre couple-merge layout with animated transition | Not started |
| 5. Share & Realtime | Share modal, Realtime presence + cursors + broadcast, deploy | Not started |

## Performance Metrics

Baseline targets (tracked once implementation begins):

| Metric | Target | Actual |
|--------|--------|--------|
| Canvas render (200 nodes + edges) | 60fps during pan/zoom | — |
| RLS p95 latency on `people.select` at 200 rows | < 100ms | — |
| Auto-save round-trip (field edit → server ACK → pill green) | < 500ms on broadband | — |
| Cursor broadcast throttle | ≤ 100ms (Supabase sweet spot) | — |
| Undo memory after 500 edits | < 50MB heap | — |

### Plan execution metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-01 | 10min | 4 | 18 |
| 01-02 | 35min | 2 | 6 |
| 01-03 | 20min | 3 | 6 created + 1 modified |
| 01-04 | 18min | 3 | 15 created + 2 modified |

## Accumulated Context

### Key Decisions (from PROJECT.md)

- Next.js 16 App Router + React 19 + TS + Tailwind v4 (Clerk 7 requires this)
- Clerk 7 + Supabase **native** third-party auth (NOT the deprecated JWT template)
- RLS uses `auth.jwt()->>'sub'` (Clerk `sub` is text, never cast via `auth.uid()`)
- `@dagrejs/dagre@3.x` (scoped, maintained) — NOT unscoped `dagre@0.8.5`
- Zustand 5 + zundo 2 + immer 11 (patch-based history, not full snapshots)
- Custom CSS transform for pan/zoom (~120 LOC, no library)
- Edges **derived** from `people[].spouseIds/parentIds/childIds` — never stored
- Relationships as arrays on `people` (NOT a join table) for v1 — pending Phase 1 decision on step-relations
- Last-write-wins per field (no CRDT)
- One Realtime channel per tree: `tree:${treeId}` (presence + broadcast multiplexed)
- Optimistic-local + authoritative-server + reconcile-via-Realtime-broadcast (not Postgres CDC)
- Ship handoff steps 1–8 as v1 (Share included); Google Sheets sync deferred to v2

### Open Questions / Todos

- **Phase 1 planning:** decide step-relations data model before schema freeze — accept `parent_ids ≤ 2` limitation OR promote to `relationships` table
- **Phase 4 planning:** empirically tune dagre `nodesep` / `ranksep` against 5+ fixture families (singleton, couple+children, remarriage chain, adoption, half-siblings)
- **Phase 5 planning:** deep research on Realtime channel lifecycle, Clerk token refresh timing, and RLS re-audit under sharing + viewer-role scenarios

### Blockers

None currently. User approval of the roadmap is the only gate to beginning Phase 1 planning.

## Session Continuity

### Last Session

- Executed Phase 1 Plan 04 (`/gsd-execute-phase 1`) — 3 tasks, linear, 2 Rule-1 auto-fixes (caret pin on @clerk/testing, Supabase nested-select array widening)
  - Task 1 (commit `093750b`): created `app/actions/trees.ts` (listMyTrees + createNewTree + renameTree with getUserIdOrThrow defense-in-depth; renameTree trims + caps at 80 chars + silently reverts on empty per UI-SPEC), `lib/utils/hashUserId.ts` (4-OKLCH palette + initialsFromName), and 6 static shell primitives: Avatar (sole rounded-full consumer in components/shell/), BrandMark (dual 20/28 CZ glyph), GridBackground, SeedPersonNode (168×auto is-me with YOU ribbon), EmptyTreeOverlay ("Your tree is ready." + UI-SPEC copy), AuthError (bootstrap + rls-reject variants)
  - Task 2 (commit `b4e946a`): created 4 interactive shell components: TreeTitle (display/edit modes, Enter/blur commits via renameTree, Escape reverts, maxLength 80), TreeSwitcher (280px Swiss-card dropdown with YOUR TREES + SHARED WITH YOU + "+ New tree"; outside-click + Escape close with setTimeout(10) guard), UserMenu (240px right-aligned dropdown with Clerk useClerk().signOut({redirectUrl:'/sign-in'})), TopBar (52px sticky role="banner" header)
  - Task 3 (commit `ed8da18`): created `app/(app)/layout.tsx` (getUserIdOrNull → redirect to /sign-in), `app/(app)/tree/[treeId]/page.tsx` (force-dynamic RSC reading tree + people under RLS via supabaseServer(); null tree → AuthError variant="rls-reject"), `e2e/signin-bootstrap.spec.ts` (Playwright @clerk/testing/playwright flow with env-gated test.skip so CI stays green); installed @clerk/testing@2.0.17 (dev-dep, exact-pinned); Playwright Chromium browser installed to ~/Library/Caches/ms-playwright/
  - `npx tsc --noEmit` clean; `npm run build` succeeded with 5 routes including `/tree/[treeId]`; `npx playwright test --list` discovered 1 test; no spec was actually run (env-gated, .env.local not populated)
  - Duration: ~18 min
  - Deferred: Playwright E2E run (requires populated .env.local + Clerk test user); visual render verification (same blocker); cross-user RLS isolation manual smoke

### Next Session

Phase 1 is code-complete (4/4 plans, 5 routes built). Ready for verification:
1. User populates `.env.local` with 7 runtime env vars (Clerk pk/sk + Supabase URL/key + Clerk SIGN_IN_URL / SIGN_UP_URL + optional CLERK_JWT_KEY)
2. User confirms Clerk Dashboard configuration (Google/Apple/email providers enabled, Supabase native third-party auth activated, /sign-in and /sign-up paths registered — per 01-03 SUMMARY Clerk Dashboard table)
3. User runs `npm run dev` → signs in → verifies 52px topbar + inline tree rename + switcher + avatar menu + seed YOU node + empty-tree greeting
4. (Optional) User creates a Clerk test user with password strategy + sets E2E_CLERK_USER_USERNAME / E2E_CLERK_USER_PASSWORD → runs `npx playwright test e2e/signin-bootstrap.spec.ts` for the full automated flow
5. Once verified, Phase 2 planning can begin (Canvas, Nodes & Edit — pan/zoom canvas, PersonNode rendering, SidePanel with auto-save pill).

### Context Notes

- Design handoff at `design_handoff_family_tree/` is a high-fidelity React/HTML prototype — treat colors, typography, and spacing as pixel-parity targets. Prototype code is not production.
- Granularity is **coarse** — expect 1–3 plans per phase. Do not over-decompose.
- Parallelization is enabled — Phase 4 and Phase 5 planning can overlap once Phase 3 is complete.
- Model profile is `quality`; tests enabled via Vitest (unit) + Playwright (E2E) per TEST-01 / TEST-02.
- Deployment target: Vercel with Clerk + Supabase env vars (DEP-01). Next.js pinned ≥ 16 (DEP-02) to close CVE-2025-29927.

---
*STATE.md is updated at every phase transition and session boundary.*
