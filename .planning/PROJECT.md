# CZ Family Tree

## What This Is

A collaborative, multi-generational family tree web app. Users sign in, land on a pan/zoom canvas showing their family, and add relatives (parent, spouse, child, sibling) inline via a radial menu. Each person has a detail side panel. Trees can be shared with other family members (edit/view) with live presence. Target feel is **a focused canvas tool** — somewhere between Figma's infinite canvas and a lightweight CRM — not a dense genealogy database.

## Core Value

A person can open the app, see their family laid out on a clean canvas, and add/edit relatives without friction. If the canvas + radial-add loop doesn't feel effortless, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Sign in with Google / Apple / email (Clerk)
- [ ] Create a tree; tree is private to the creator until shared
- [ ] Pan/zoom infinite canvas with faint dot grid
- [ ] Render `PersonNode` cards (180×76) at stored x/y with gender accent, avatar, name, year range
- [ ] Draw spouse + parent-child edges (SVG, derived from relationship arrays)
- [ ] Click to select, double-click / Enter to open side panel
- [ ] Side panel: edit identity, life, read-only relationships, actions (center/remove), auto-save indicator
- [ ] Radial add menu (Parent/Spouse/Child/Sibling) from selected node
- [ ] Collision-nudge on add so new nodes don't overlap
- [ ] Undo/redo (⌘Z / ⌘⇧Z), full-state history
- [ ] Bottom floating toolbar (undo, redo, zoom, fit, Tidy, panel toggle)
- [ ] Toast messages for structural actions
- [ ] Tidy layout button using `@dagrejs/dagre` (couples-as-merged-nodes)
- [ ] Share modal: invite by email (Editor/Viewer), manage invitees, link-sharing toggle
- [ ] Live presence (avatar stack) + live cursors + real-time edit broadcast (Supabase Realtime)
- [ ] ⌘K / ⌘F search palette to jump to a person by name
- [ ] Delete-person confirmation dialog (destructive action, shared tree)
- [ ] Error / disconnect banner when realtime or save fails
- [ ] Basic accessibility: focus rings, ARIA labels on all controls, Tab-cycle into the canvas
- [ ] Persistence to Supabase Postgres with RLS
- [ ] Pixel-parity with the handoff design tokens (colors, typography, spacing, radii, shadows)
- [ ] Deployed to Vercel

### Out of Scope (v1)

- **Google Sheets sync drawer** — handoff step 9, deferred to v2. UI design is complete but API/OAuth work is not worth v1 scope.
- **Arrow-key canvas traversal between nodes** — v1 ships focus rings + ARIA + Enter/Esc/⌘Z. Arrow-key sibling/generation traversal is v2.
- **CRDT conflict resolution** — last-write-wins per field is sufficient for v1 (family trees have very low concurrent-edit pressure).
- **Public link-viewable trees beyond the Share-modal toggle** — no SEO-indexed public pages.
- **Mobile-optimized canvas interactions** — desktop-first; mobile gets a usable but not polished experience.
- **Import/export (GEDCOM, CSV)** — pulls the product into the "Ancestry competitor" category it explicitly rejects. Stay canvas-first.
- **DNA / record hints / Smart Matches / shared-world tree / source citations / fan/pedigree chart views** — anti-features. These are the features of a genealogy database, not a canvas tool. Building any of them would contradict the Core Value.
- **Photo upload per person** — deferred to v1.x. Avatar initials only in v1 to stay focused on the canvas loop.
- **Right-click context menu** — deferred to v1.x. Radial menu + side panel cover v1 needs.
- **Comments / threaded discussion on nodes** — out of scope; would push the product toward FigJam and away from "focused canvas tool".

## Context

- **Design handoff:** A complete, high-fidelity design was delivered by Claude Design in `design_handoff_family_tree/` (HTML prototype + React JSX references + README). Colors, typography, spacing, and interactions are close to final and should be recreated pixel-for-pixel.
- **Prototype caveat:** The handoff is a design reference, not production code. It uses inline Babel JSX + in-memory state. Every piece of that needs to become real (Next.js components, server persistence, real auth).
- **Layout lib:** The prototype's `layoutTree` is a hand-rolled Reingold–Tilford approximation and breaks on complex families. We'll replace with `dagre`, treating couples as merged nodes and children as edges from the couple-node.
- **Icons:** Inline SVG in `icons.jsx` — replace 1:1 with `lucide-react` equivalents (User, Plus, X, Undo2, Redo2, Maximize2, Sparkles, Share2, Trash2, ExternalLink, …).

## Constraints

- **Tech stack**: Next.js 16 App Router + React 19 + TypeScript + Tailwind v4 — Clerk 7 (current Core 3) requires Next 16 / React 19; staying on Next 14 forces legacy Clerk 5.
- **Auth**: Clerk 7 + Supabase native third-party auth (NOT the deprecated JWT template). RLS uses `auth.jwt()->>'sub'` (Clerk userId is a text string, not a UUID — `auth.uid()` does NOT work).
- **Database**: Supabase Postgres with Row Level Security + Realtime — one vendor for persistence and presence.
- **Layout library**: `@dagrejs/dagre@3.x` (NOT the unscoped `dagre` frozen at 0.8.5). Couples-as-merged-nodes pattern, children as edges from the couple-node.
- **State management**: Zustand 5 + `zundo` temporal middleware + `immer` — replaces the prototype's hand-rolled history array. Store factory + Context Provider (never module-scoped, SSR would leak).
- **Testing**: Vitest (unit for `model.ts`: edges, layout, mutations) + Playwright (E2E for canvas flows).
- **Deployment**: Vercel — native Next.js hosting. Pin Next.js to a post-CVE-2025-29927 release (≥14.2.25 / ≥15.2.3 / Next 16 already safe).
- **Design fidelity**: Pixel-parity with handoff tokens defined in `styles.css` (colors, typography, spacing, radii, shadow). Tailwind v4 `@theme` block maps the handoff's `:root` CSS variables 1:1.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 16 App Router + React 19 + TS + Tailwind v4 | Clerk 7 requires Next 16 / React 19; Tailwind v4 `@theme` maps handoff CSS vars 1:1 | — Pending |
| Clerk 7 + Supabase native third-party auth | JWT template deprecated 2025-04-01; native integration is current best practice | — Pending |
| Supabase Postgres + RLS + Realtime | One vendor for persistence + live presence; RLS maps cleanly to tree sharing | — Pending |
| `@dagrejs/dagre@3.x` for graph layout | Scoped package is maintained; unscoped `dagre` is frozen at 0.8.5 | — Pending |
| Zustand + zundo + immer | Purpose-built for the handoff's history pattern; replaces hand-rolled snapshot array | — Pending |
| Custom CSS transform for pan/zoom (no library) | Library options (`react-zoom-pan-pinch`, React Flow) fight the handoff's `translate(x,y) scale(k)` wrapper model; ~120 LOC custom is the right path | — Pending |
| Ship handoff steps 1–8 as v1 (Share included) | Share modal makes the app feel collaborative from day one; Sheets sync deferred | — Pending |
| Live presence + live cursors in v1 | Supabase Realtime supports both cheaply; avatar stack alone under-delivers on the multiplayer promise | — Pending |
| Edges derived, not stored | Per handoff: `computeEdges(people)` — single source of truth in relationship arrays | — Pending |
| Relationships as arrays on `people` (not a join table) | Matches handoff TS contract; simpler writes; GIN-indexable. Revisit in v2 if typed/time-bounded relationships needed | — Pending |
| Last-write-wins per field | CRDT is overkill for family-tree concurrency patterns | — Pending |
| Optimistic-local, authoritative-server, reconcile-via-Realtime | Clients broadcast; server writes don't feed back through Postgres CDC (RLS-per-row too costly) | — Pending |
| One Realtime channel per tree (`tree:${treeId}`) | Presence + broadcast multiplexed; throttle drag to ~30Hz, debounce field edits to 250–500ms | — Pending |
| Pronouns column shipped in Phase 1 initial schema; Phase 2 side panel wires the UI (D-08) | Avoids a migration + types-regen in Phase 2; PersonPatchSchema already supports pronouns at the Zod layer | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-21 after initialization*
