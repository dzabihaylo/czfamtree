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
- [ ] Tidy layout button using `dagre` (couples-as-merged-nodes)
- [ ] Share modal: invite by email (Editor/Viewer), manage invitees, link-sharing toggle
- [ ] Live presence + real-time edit broadcast (Supabase Realtime)
- [ ] Persistence to Supabase Postgres with RLS
- [ ] Pixel-parity with the handoff design tokens (colors, typography, spacing, radii, shadows)
- [ ] Deployed to Vercel

### Out of Scope (v1)

- **Google Sheets sync drawer** — handoff step 9, deferred to v2. UI design is complete but API/OAuth work is not worth v1 scope.
- **Full accessibility pass for canvas keyboard nav** — arrow-key traversal between nodes, radial screen-reader labels. v1 ships with the fundamentals (Enter/Esc/⌘Z), full a11y is v2.
- **CRDT conflict resolution** — last-write-wins per field is sufficient for v1 (family trees have very low concurrent-edit pressure).
- **Public link-viewable trees beyond the Share-modal toggle** — no SEO-indexed public pages.
- **Mobile-optimized canvas interactions** — desktop-first; mobile gets a usable but not polished experience.
- **Import/export (GEDCOM, CSV)** — would broaden scope too much for v1.

## Context

- **Design handoff:** A complete, high-fidelity design was delivered by Claude Design in `design_handoff_family_tree/` (HTML prototype + React JSX references + README). Colors, typography, spacing, and interactions are close to final and should be recreated pixel-for-pixel.
- **Prototype caveat:** The handoff is a design reference, not production code. It uses inline Babel JSX + in-memory state. Every piece of that needs to become real (Next.js components, server persistence, real auth).
- **Layout lib:** The prototype's `layoutTree` is a hand-rolled Reingold–Tilford approximation and breaks on complex families. We'll replace with `dagre`, treating couples as merged nodes and children as edges from the couple-node.
- **Icons:** Inline SVG in `icons.jsx` — replace 1:1 with `lucide-react` equivalents (User, Plus, X, Undo2, Redo2, Maximize2, Sparkles, Share2, Trash2, ExternalLink, …).

## Constraints

- **Tech stack**: Next.js 14 App Router + TypeScript + Tailwind — matches handoff suggestion, good Vercel fit.
- **Auth**: Clerk — fastest path to Google/Apple/email, good UX out of box.
- **Database**: Supabase Postgres with Row Level Security + Realtime — one vendor for persistence and presence.
- **Layout library**: `dagre` — handoff's first suggestion, supports marriage-aware layout via couple-node merging.
- **Testing**: Vitest (unit for `model.ts`: edges, layout, mutations) + Playwright (E2E for canvas flows).
- **Deployment**: Vercel — native Next.js hosting.
- **Design fidelity**: Pixel-parity with handoff tokens defined in `styles.css` (colors, typography, spacing, radii, shadow). No visual drift.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 14 App Router + TS + Tailwind | Matches handoff suggestion; Vercel-native; server components for tree data fetch | — Pending |
| Clerk for auth | Google/Apple/email in minutes; matches sign-in design (3 buttons, no form) | — Pending |
| Supabase Postgres + RLS + Realtime | One vendor for persistence + live presence; RLS maps cleanly to tree sharing | — Pending |
| `dagre` for graph layout | Handoff's first suggestion; marriage-aware via merged couple-nodes | — Pending |
| Ship handoff steps 1–8 as v1 (Share included) | Share modal makes the app feel collaborative from day one; Sheets sync deferred | — Pending |
| Live presence in v1 | Supabase Realtime is cheap to add once DB is live; raises perceived quality | — Pending |
| Edges derived, not stored | Per handoff: `computeEdges(people)` — single source of truth in relationship arrays | — Pending |
| Last-write-wins per field | CRDT is overkill for family-tree concurrency patterns | — Pending |

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
