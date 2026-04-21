---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-21T19:01:46.417Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 4
  completed_plans: 1
  percent: 25
---

# STATE: CZ Family Tree

**Last updated:** 2026-04-21 (after plan 01-01 execution)

## Project Reference

- **Name:** CZ Family Tree (czfamtree)
- **Core value:** A person opens the app, sees their family on a clean canvas, and adds/edits relatives without friction. The canvas + radial-add loop must feel effortless.
- **Current focus:** Phase 01 — foundation
- **Planning root:** `.planning/`

## Current Position

Phase: 01 (foundation) — EXECUTING
Plan: 1 of 4 complete; next is 01-02

- **Milestone:** v1 Launch
- **Phase:** 01 — Foundation (executing)
- **Plan:** 01-01 complete (scaffold + Clerk + Supabase + tokens + Zustand); 01-02 next (schema + RLS + bootstrap_tree RPC)
- **Status:** Executing Phase 01
- **Progress:** [█░░░░░░░░░] 1 / 4 plans of Phase 1 done · 0 / 5 phases complete

### Roadmap Overview

| Phase | Goal | Status |
|-------|------|--------|
| 1. Foundation | Signed-in user lands in own private tree with schema + RLS correct | Executing (1/4 plans done) |
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

- Executed Phase 1 Plan 01 (`/gsd-execute-phase 1`)
  - Scaffolded Next 16 + React 19 + TS 6 + Tailwind v4 with exact-pinned deps (2b7e54e)
  - Wired Clerk 7 middleware + Supabase-js factories (server/browser) + auth helpers + cn util (73f0e3f)
  - Mapped handoff OKLCH tokens into Tailwind v4 @theme + root layout with ClerkProvider + Inter/Mono fonts (81abb33)
  - Added Zustand 5 + zundo 2 + immer 11 store factory with SSR-safe TreeStoreProvider (bd77062)
  - Duration: ~10 min · 4 tasks · 18 files created · 4 auto-fix deviations (all blocking dependency issues — logged in 01-01-SUMMARY.md)
  - `npm run build` and `tsc --noEmit` both green after completion

### Next Session

Run `/gsd-execute-phase 1` again to execute Plan 01-02 (DB schema + RLS + `bootstrap_tree` RPC + generated types + RLS smoke test). Plan 01-02 is blocking for plans 01-03 and 01-04. Before executing, user must populate `.env.local` with Clerk + Supabase keys (see 01-01-SUMMARY.md → "User Setup Required").

### Context Notes

- Design handoff at `design_handoff_family_tree/` is a high-fidelity React/HTML prototype — treat colors, typography, and spacing as pixel-parity targets. Prototype code is not production.
- Granularity is **coarse** — expect 1–3 plans per phase. Do not over-decompose.
- Parallelization is enabled — Phase 4 and Phase 5 planning can overlap once Phase 3 is complete.
- Model profile is `quality`; tests enabled via Vitest (unit) + Playwright (E2E) per TEST-01 / TEST-02.
- Deployment target: Vercel with Clerk + Supabase env vars (DEP-01). Next.js pinned ≥ 16 (DEP-02) to close CVE-2025-29927.

---
*STATE.md is updated at every phase transition and session boundary.*
