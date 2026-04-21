# Project Research Summary

**Project:** czfamtree — Collaborative family tree canvas app
**Domain:** Multiplayer pan/zoom canvas (Figma-for-your-family) with Clerk auth + Supabase persistence & Realtime
**Researched:** 2026-04-21
**Confidence:** HIGH

## Executive Summary

czfamtree is a **canvas-first** collaborative family tree — positioned deliberately between Figma's infinite canvas and a lightweight CRM, explicitly **not** a genealogy database (no DNA, no records corpus, no GEDCOM import, no shared-world tree). The defining differentiators are a **radial add menu** for inline relationship creation, **live multiplayer** editing (which no genealogy competitor offers), and **dagre-powered Tidy** with couple-merge layout. Category peers (Figma/FigJam/Miro) set the baseline: infinite pan/zoom, presence, undo, auto-save, search.

Stack: **Next.js 16 (App Router) + React 19 + TypeScript 6 + Tailwind v4 + Clerk 7 + Supabase (supabase-js 2.104 + @supabase/ssr 0.10) + @dagrejs/dagre 3 + Zustand 5 + zundo 2 + immer 11**. Critical corrections vs. original assumptions: **Next.js 14 → 16** (required by Clerk 7 Core 3); **do NOT use the legacy Clerk JWT-template for Supabase** (deprecated April 2025) — use native third-party-auth with `auth.jwt()->>'sub'` in RLS; **do NOT use react-zoom-pan-pinch or React Flow** — hand-roll the CSS transform (~120 LOC) because both fight the handoff's `translate(x,y) scale(k)` model. Edges are **derived** from `people[].spouseIds/parentIds/childIds` (single source of truth), never persisted.

Critical risks cluster in four areas: **(1) coordinate-space discipline** (lock in Phase 2), **(2) Supabase RLS correctness** (cross-table recursion + O(rows×members) perf), **(3) Realtime lifecycle hygiene** (channel leaks on remount, 60s Clerk token refresh, broadcast throttling), and **(4) auto-save trust** (the "Saved" pill must flip green on server ACK, never on optimistic commit). Mitigations well-documented: `SECURITY DEFINER` helpers, mandatory `removeChannel` cleanup, Immer patch-based undo, serial save queue, `idle → dirty → saving → saved | error` state machine.

## Key Findings

### Recommended Stack (see STACK.md)

- **Next.js 16.2.4 (App Router) + React 19.2.5 + TypeScript 6.0.3** — RSC for no-flash initial tree paint, Server Actions replace `/api` boilerplate
- **Clerk `@clerk/nextjs` 7.2.3** — fastest path to 3-button sign-in, native Supabase third-party-auth
- **Supabase (`supabase-js` 2.104 + `@supabase/ssr` 0.10)** — `accessToken: async () => (await auth()).getToken()`, RLS via `auth.jwt()->>'sub'`
- **Tailwind CSS 4.2.4** — CSS-first `@theme` tokens map 1:1 to handoff's `--bg`, `--ink-*`, `--accent`, `--rule`
- **`@dagrejs/dagre` 3.0.0** (NOT unscoped `dagre@0.8.5`) — Tidy with couple-merge pre-processing
- **Custom CSS transform** — single wrapper `div` + hand-rolled wheel/pan/drag handlers dividing deltas by `k`
- **Zustand 5 + zundo 2 + immer 11** — store factory + Provider (never module-scoped; SSR would leak)
- **React Hook Form 7 + Zod 4** — side-panel forms with shared client↔server↔DB schemas

### Expected Features (see FEATURES.md)

Product competes in **canvas-tool** category, not **genealogy-database**. This single filter collapses the feature matrix.

**Must have, handoff-covered:** pan/zoom, nodes, radial add, side panel, undo/redo, auto-save pill, shortcuts, Tidy, Share modal, presence, persistence, pixel-parity, Vercel deploy.

**Must add to v1 (handoff gaps):** ⌘K/⌘F search palette, live cursors (not just avatars), delete-person confirm, error/disconnect banner, basic a11y (focus rings + ARIA + shortcut scoping).

**Defer to v1.x:** photo upload, right-click context menu, duplicate person, PNG/PDF export, minimap, pinned comments, mobile read-only view.

**Defer to v2+:** Google Sheets two-way sync, version history, activity feed, expanded keyboard nav, GEDCOM *export* only.

**Anti-features (never build):** DNA/records/ethnicity, GEDCOM import, source citations, shared-world tree, public SEO-indexed trees, pedigree/fan chart views.

### Architecture Approach (see ARCHITECTURE.md)

- One route per tree (`/tree/[treeId]`), RSC for initial paint, per-request Zustand store via factory + Provider
- `<RealtimeBridge>` subscribes to one channel per tree (`tree:${treeId}`) for presence + broadcast
- Writes: typed Server Actions with optimistic local apply + RLS-enforced server persistence + client broadcast (throttled to 30Hz during drag)
- Edges always derived via `computeEdges(people)` — never stored
- Postgres: `trees | tree_members | people | invites`; relationships as arrays with GIN indexes (per handoff contract)
- RLS via `clerk_user_id()` helper reading `auth.jwt()->>'sub'`; `SECURITY DEFINER` for cross-table checks to avoid recursion

### Critical Pitfalls (see PITFALLS.md)

Top 10 ranked by recovery cost × likelihood:

1. **Coordinate-space confusion** — drag deltas must divide by `k`; screenToCanvas helper; unit-test at k∈{0.25,1,4}. Lock in Phase 2.
2. **RLS recursion + perf** — `SECURITY DEFINER` helper `user_tree_ids(uid)`; wrap `auth.uid()` in `(SELECT…)`; GIN indexes. Lock in Phase 1.
3. **Undo memory blow-up** — Immer patches with `enablePatches()`, cap at 100 commits, debounce typing. Lock in Phase 6.
4. **Auto-save pill lies** — flip green on server ACK only; state machine; serial save queue. Lock in Phase 6. **Single most trust-critical pitfall.**
5. **Realtime channel leaks + reconnect storms** — mandatory `removeChannel`; `supabase.realtime.setAuth()` every ~60s; throttle 100ms cursors, 30Hz drag. Lock in Phase 8.
6. **Wheel zoom fighting browser** — register via `ref.addEventListener('wheel', h, {passive:false})`; macOS pinch = `wheel` with `ctrlKey=true`. Lock in Phase 2.
7. **dagre couple-merge off-by-one + Tidy destroys manual layout** — synthetic couple nodes width `2×NODE_W + couple_gap`; preview/undo snackbar. Lock in Phase 7.
8. **Clerk anti-patterns** — no `auth()` in root layout; don't serialize `currentUser()` across server/client; pin Next ≥14.2.25 (CVE-2025-29927). Lock in Phase 1 + 3.
9. **Cycles, self-parents, step-relations** — DB CHECK + cycle walk on mutation; flag `parentIds ≤ 2` as potential v2 migration to relationships table. Lock in Phase 1.
10. **SVG edge perf** — single `<svg>` overlay (not per-edge); memoize `computeEdges` on arrays; split topology from geometry. Lock in Phase 4.

## Implications for Roadmap

Research validates the handoff's **8-phase build order**:

1. **Data Model + Auth Foundation** — schema/RLS mistakes are highest-cost-to-repair; Clerk+Supabase native integration, cycle CHECKs, GIN indexes
2. **Canvas + Static Nodes + Pan/Zoom** — lock coordinate contract; hand-rolled transform; design-token Tailwind v4 setup
3. **Selection + SidePanel (Edit Flow)** — establishes optimistic + server-action + auto-save-pill pattern
4. **Edges (computeEdges + SVG render)** — sets perf budget; single-svg overlay; pure Vitest-covered `computeEdges`
5. **Add-Relative + Radial Menu** — the signature differentiator; atomic insert + symmetric relationship patches
6. **Undo/Redo + Auto-Save Indicator** — trust-critical; Immer patches + serial save queue + "Couldn't save" retry
7. **Tidy Layout (dagre)** — couple-merge pre-processing; 300ms animated transition; Cmd-Z as safety net
8. **Share Modal + Collaborators + Realtime** — multiplayer amplifies all prior quality; RLS re-audit; channel lifecycle hygiene

**Parallelization:** Phases 3 (SidePanel) and 4 (Edges) can run in parallel — no dependency between them. Other phases are strict sequence.

**Research flags for later (deeper `/gsd-research-phase`):**
- Phase 1: step-relations data model decision (arrays vs relationships table) before schema freeze
- Phase 6: undo + auto-save state machine + offline recovery design
- Phase 7: dagre couple-merge with fixture families (remarriages, adoptions, half-siblings)
- Phase 8: channel lifecycle, token refresh, broadcast-vs-postgres_changes split

**Skip deeper research:** Phases 2, 3, 4, 5 — standard patterns, handoff has reference implementation.

**v1 additions to fold into existing phases:**
- ⌘K search → Phase 3 or 5
- Live cursors → Phase 8 (presence payload)
- Delete confirm → Phase 3 (SidePanel Remove)
- Error/disconnect banner → Phase 6 (save errors) + Phase 8 (reconnect)
- Basic a11y → distributed; checkpoint end of Phase 5

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every version verified against npm registry; every integration pattern verified against Context7 + official Clerk/Supabase/Next.js docs |
| Features | HIGH (table stakes/anti-features); MEDIUM (differentiator ordering — depends on post-launch usage data) |
| Architecture | HIGH | Clerk+Supabase native, Zustand factory+provider, derived edges, channel-per-tree are well-established patterns |
| Pitfalls | HIGH | Every major pitfall backed by official docs or recent community post-mortems |

**Overall: HIGH confidence** — ready for requirements and roadmap.

### Gaps to Address in Planning

- **Step-relations data model (Pitfall #19)** — `parentIds ≤ 2` arrays collapse step/adoptive into biological. Phase 1 planning must decide: accept limitation + document workaround, or promote to `relationships` table before schema freeze.
- **dagre `nodesep`/`ranksep` constants** — MEDIUM confidence; Phase 7 needs empirical tuning against 5+ fixture families.
- **v1.x feature ordering** — photo vs comments vs minimap — depends on usage data from v1 launch.
- **Invite email delivery** — Phase 8 call: link-in-modal only (v1) vs Resend/Clerk transactional email.

---
*Research completed: 2026-04-21. Ready for requirements definition.*
