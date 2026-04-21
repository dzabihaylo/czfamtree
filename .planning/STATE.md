---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-21T19:34:07.029Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 4
  completed_plans: 3
  percent: 75
---

# STATE: CZ Family Tree

**Last updated:** 2026-04-21 (after plan 01-03 execution)

## Project Reference

- **Name:** CZ Family Tree (czfamtree)
- **Core value:** A person opens the app, sees their family on a clean canvas, and adds/edits relatives without friction. The canvas + radial-add loop must feel effortless.
- **Current focus:** Phase 01 — foundation
- **Planning root:** `.planning/`

## Current Position

Phase: 01 (foundation) — EXECUTING
Plan: 3 of 4 complete; next is 01-04

- **Milestone:** v1 Launch
- **Phase:** 01 — Foundation (executing)
- **Plan:** 01-01 + 01-02 + 01-03 complete (scaffold + Clerk + Supabase + tokens + Zustand + cloud-applied schema + RLS + typed Database generic + Clerk sign-in/sign-up pages + split-50/50 auth shell + decorative SVG + bootstrap server action + root redirect); 01-04 next (authenticated shell + `/tree/[treeId]` route)
- **Status:** Executing Phase 01
- **Progress:** [████████░░] 75%

### Roadmap Overview

| Phase | Goal | Status |
|-------|------|--------|
| 1. Foundation | Signed-in user lands in own private tree with schema + RLS correct | Executing (3/4 plans done) |
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

- Executed Phase 1 Plan 03 (`/gsd-execute-phase 1`) — 3 tasks, linear, no deviations
  - Task 1 (commit `29885d6`): created `app/(auth)/layout.tsx` split-50/50 auth shell (brand + `Every name, a branch.`/`Every branch, a story.` headline + UI-SPEC sub-headline without Google Sheet clause + foot) and `components/auth/SignInIllustration.tsx` (verbatim SVG mini-tree from handoff login.jsx L60-123 with OKLCH literals, GEN 01/02 labels, `fig. 01 — the Chan-Zabihaylo family` caption, static `3 editors online` presence)
  - Task 2 (commit `55a962f`): created `app/(auth)/sign-in/[[...sign-in]]/page.tsx` with Clerk `<SignIn />` + full appearance block (variables: OKLCH tokens + 0px borderRadius + Inter + weight-600-as-medium; elements: Swiss card with 4px hard shadow, translate-on-hover social buttons, hidden Clerk default header; layout: blockButton variant + top placement → 3-button vertical stack). Mirror at `app/(auth)/sign-up/[[...sign-up]]/page.tsx`.
  - Task 3 (commit `c471cfa`): created `app/actions/bootstrap.ts` (`'use server'` → `getUserIdOrThrow()` defense-in-depth → SELECT `tree_members` → fall through to `supabase.rpc('bootstrap_tree', {p_owner_user_id, p_tree_name: 'My family tree', p_seed_person_name: profile?.displayName ?? 'You'})`), `app/page.tsx` RSC with `dynamic = 'force-dynamic'` redirecting to `/tree/{id}`, and appended `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` + `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` to `.env.local.example`
  - `npx tsc --noEmit` clean; `npm run build` succeeded with 4 routes: `/`, `/_not-found`, `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`
  - Duration: ~20 min
  - Deferred: visual render verification (requires populated `.env.local` + `npm run dev`); end-to-end OAuth round-trip (same prerequisite + Clerk Dashboard provider config)
  - AUTH-04 gap: Clerk `appearance` reaches ~80% pixel-parity; remaining 20% (hardcoded "OR" divider, possibly-overridden hover transform, un-reorderable email-vs-social sections) is ACCEPTED per RESEARCH.md §11 — not chased further

### Next Session

Run `/gsd-execute-phase 1` again to execute Plan 01-04 (authenticated shell: topbar + `/tree/[treeId]` route + seed PersonNode + tree rename + tree switcher + user menu). Plan 01-04 consumes `resolveOrBootstrapTree()` from `app/actions/bootstrap.ts` for the "+ New tree" switcher action, renders the seeded "You" person from the RPC-created people row, and lands the final piece of Phase 01. Before the E2E sign-in flow works, user must populate `.env.local` (Clerk pk/sk + Supabase URL/key + the 2 new NEXT_PUBLIC_CLERK_SIGN_IN_URL / SIGN_UP_URL route hints — defaults are in `.env.local.example`).

### Context Notes

- Design handoff at `design_handoff_family_tree/` is a high-fidelity React/HTML prototype — treat colors, typography, and spacing as pixel-parity targets. Prototype code is not production.
- Granularity is **coarse** — expect 1–3 plans per phase. Do not over-decompose.
- Parallelization is enabled — Phase 4 and Phase 5 planning can overlap once Phase 3 is complete.
- Model profile is `quality`; tests enabled via Vitest (unit) + Playwright (E2E) per TEST-01 / TEST-02.
- Deployment target: Vercel with Clerk + Supabase env vars (DEP-01). Next.js pinned ≥ 16 (DEP-02) to close CVE-2025-29927.

---
*STATE.md is updated at every phase transition and session boundary.*
