# Roadmap: CZ Family Tree

**Created:** 2026-04-21
**Granularity:** Coarse (3-5 broader phases, 1-3 plans each)
**Core Value:** A person can open the app, see their family laid out on a clean canvas, and add/edit relatives without friction. If the canvas + radial-add loop doesn't feel effortless, nothing else matters.

## Milestone: v1 Launch (shipped to Vercel, multiplayer family tree canvas)

Milestone outcome: a user signs in with Google/Apple/email, lands in their tree, adds relatives via a radial menu on a pan/zoom canvas, and can share the tree with family members who appear live on the same canvas.

## Phases

- [ ] **Phase 1: Foundation** — Next.js 16 + Clerk 7 + Supabase schema & RLS + sign-in screen; first sign-in lands user in an empty seeded tree
- [ ] **Phase 2: Canvas, Nodes & Edit** — pan/zoom canvas, PersonNode rendering, selection, SidePanel with auto-save pill, derived SVG edges
- [ ] **Phase 3: Authoring & History** — radial add menu with collision-nudge, undo/redo (zundo + Immer), toolbar, toasts, ⌘K search, delete-confirm, a11y sweep
- [ ] **Phase 4: Tidy & Layout** — `@dagrejs/dagre` with couple-merge synthetic nodes, 300ms animated transition, single undoable history entry
- [ ] **Phase 5: Share & Realtime** — Share modal + invites, `tree_members` roles, one Realtime channel per tree (presence + live cursors + throttled broadcast), disconnect banner, RLS re-audit, tests, Vercel deploy

## Phase Details

### Phase 1: Foundation
**Goal:** A signed-in user lands in their own private tree, ready to build. The schema, RLS, and auth are correct before any canvas code exists, because fixing them post-launch is expensive.
**Depends on:** Nothing (first phase)
**Requirements:**
- Auth: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
- Tree ownership: TREE-01, TREE-02, TREE-03, TREE-04
- Data model: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10
- Design & deploy baseline: DESIGN-03, DEP-02
**Success Criteria** (what must be TRUE for a user):
  1. I can sign in with Google, Apple, or email on a pixel-parity sign-in screen and my session survives a refresh
  2. On my first sign-in, I auto-land in a freshly created tree with a seed "You" node visible at the tree route
  3. I can name a tree inline, create additional trees, and switch between trees I own or have been invited to
  4. A second signed-in user cannot read my tree (RLS enforced via `auth.jwt()->>'sub'`)
  5. Signing out from the user menu returns me to the sign-in screen
**Plans:** 4 plans
Plans:
- [ ] 01-01-PLAN.md — Infrastructure scaffolding (Next 16 + Clerk + Supabase client factories + Tailwind v4 tokens + fonts)
- [ ] 01-02-PLAN.md — Database schema + RLS + `bootstrap_tree` RPC + generated types + RLS smoke test [BLOCKING: supabase db push]
- [ ] 01-03-PLAN.md — Clerk SignIn + SignUp pages + split-50/50 auth layout + SVG illustration + bootstrap server action + root redirect
- [ ] 01-04-PLAN.md — Authenticated shell: topbar (brand + TreeTitle + TreeSwitcher + UserMenu) + tree route + SeedPersonNode + EmptyTreeOverlay + AuthError + Playwright E2E
**UI hint:** yes
**Research flags:** Step-relations data model decision must be resolved during phase planning before schema freeze — the `parent_ids` array (max 2) is a biologically-inspired choice that cannot represent step/adoptive parents beyond two. Planning must explicitly choose: (a) accept the limitation and document workaround for v1, or (b) promote parent-child to a `relationships(tree_id, a_id, b_id, kind, lineage_type)` table before DATA-06 is frozen. Per PITFALLS #19 and SUMMARY gaps.

### Phase 2: Canvas, Nodes & Edit
**Goal:** A user can see their tree on a pan/zoom canvas, select nodes, edit person fields in a side panel, and trust that their edits are actually saved (not just optimistically displayed).
**Depends on:** Phase 1
**Requirements:**
- Canvas & pan/zoom: CANV-01, CANV-02, CANV-03, CANV-04, CANV-05, CANV-06
- PersonNode rendering: NODE-01, NODE-02, NODE-03, NODE-04, NODE-05, NODE-06
- Edges (derived, single SVG overlay): EDGE-01, EDGE-02, EDGE-03, EDGE-04, EDGE-05, EDGE-06
- Selection: SEL-01, SEL-02, SEL-03
- Side panel: PANEL-01, PANEL-02, PANEL-03, PANEL-04, PANEL-05, PANEL-06, PANEL-07, PANEL-08, PANEL-09
- Auto-save & error handling: SAVE-01, SAVE-02, SAVE-03, SAVE-04, ERR-01
- Design fidelity: DESIGN-01, DESIGN-02
**Success Criteria** (what must be TRUE for a user):
  1. I can pan by dragging empty canvas and zoom with ⌘+scroll or trackpad pinch; zoom anchors to my cursor and clamps to [0.25, 4]
  2. I can see my existing people as 180×76 cards with avatars, gender accent, and birth–death years at correct canvas positions, connected by spouse + parent-child edges drawn in a single SVG overlay
  3. I can click a node to select it, drag it to reposition, double-click (or press Enter) to open the side panel, and edit Name / gender / pronouns / life fields with my changes persisting on server ACK
  4. The auto-save pill flips green ONLY after the server confirms — never on optimistic commit — and turns red with a "Couldn't save" toast + Retry when a save fails
  5. Colors, typography, spacing, radii, shadows, and lucide icons match the handoff styles.css pixel-for-pixel
**Plans:** TBD
**UI hint:** yes

### Phase 3: Authoring & History
**Goal:** A user can grow the tree: add relatives inline via the radial menu, undo mistakes, find any person, and operate the canvas confidently via keyboard. The authoring loop is the product's differentiator — it must feel effortless.
**Depends on:** Phase 2
**Requirements:**
- Radial menu: RAD-01, RAD-02, RAD-03
- Add-relative: ADD-01, ADD-02, ADD-03, ADD-04
- Undo/redo & history: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05
- Toolbar & toasts: TOOL-01, TOOL-02, TOAST-01
- Search: SRCH-01, SRCH-02
- Accessibility: A11Y-01, A11Y-02, A11Y-03
**Success Criteria** (what must be TRUE for a user):
  1. I can click the + on a selected node, pick Parent / Spouse / Child / Sibling from the radial menu, and a new person appears adjacent (nudged clear of existing nodes) with their side panel open and Name field focused
  2. ⌘Z and ⌘⇧Z undo and redo drag, field edit, add-relative, and remove-person — each committed as exactly one history entry — and the shortcut is ignored when I'm typing in an input or textarea
  3. The bottom toolbar pill gives me undo/redo/zoom/fit/tidy/panel-toggle with disabled states when an action is unavailable, and toasts confirm "Added parent", "Centered on …", "Couldn't save"
  4. ⌘K / ⌘F opens a search palette listing all people in the tree; picking a result selects them and recenters the canvas
  5. Every interactive control has a visible focus ring and ARIA label; Tab cycles topbar → canvas → toolbar → side panel in that order
**Plans:** TBD
**UI hint:** yes

### Phase 4: Tidy & Layout
**Goal:** A user can clean up a tangled tree with one click and see all nodes smoothly animate into a readable layered layout. If they don't like the result, one ⌘Z restores their prior arrangement.
**Depends on:** Phase 3
**Requirements:**
- Tidy: TIDY-01, TIDY-02, TIDY-03, TIDY-04, TIDY-05
**Success Criteria** (what must be TRUE for a user):
  1. Clicking ✨ Tidy on a messy tree re-arranges all nodes into clean generations with spouses side-by-side and children centered below their couple — driven by `@dagrejs/dagre@3` with couple-merge synthetic nodes
  2. The layout transition animates over ~300ms so I can follow where each node moves and preserve my spatial memory
  3. A single "Tidied layout · ⌘Z to restore" toast appears, and pressing ⌘Z fully restores my prior layout as one history entry
  4. Tidy produces correct results on fixture families including singletons, simple couples with children, remarriages, and adoptive parents
**Plans:** TBD
**UI hint:** yes
**Research flags:** Dagre couple-merge requires empirical tuning during phase planning. `nodesep` / `ranksep` constants and synthetic couple-node widths (`2×NODE_W + 24`) must be tested against at least five fixture families (singleton, simple couple, remarriage chain, adoption, half-siblings). Non-determinism from unstable node ordering is a known failure mode — deep-research or a dedicated exploration spike is warranted before implementation, per PITFALLS #16, #17 and SUMMARY gaps.

### Phase 5: Share & Realtime
**Goal:** A user can share a tree with family, see everyone's presence live, and feel their edits propagate to other browsers in real time without fear of losing work. The multiplayer promise is delivered; the app is deployed.
**Depends on:** Phase 3 (share modal depends on authoring UX; may proceed in parallel with Phase 4 during planning but integrates last)
**Requirements:**
- Share modal & invites: SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05, SHARE-06, SHARE-07, SHARE-08
- Realtime: RT-01, RT-02, RT-03, RT-04, RT-05, RT-06, RT-07, RT-08, RT-09, RT-10
- Error handling: ERR-02
- Tests & deploy: TEST-01, TEST-02, DEP-01
**Success Criteria** (what must be TRUE for a user):
  1. I can click Share, enter an email and role (Editor/Viewer), and get an invite URL I can copy — the invitee accepts via Clerk sign-in and joins as a `tree_members` row that lands them in the tree
  2. When I open a shared tree, I see an avatar stack of currently-present collaborators and their live cursors moving in canvas-space; my cursor is broadcast at ≤100ms throttle
  3. When a collaborator edits a person, adds a relative, or drags a node, I see the change live — broadcast via one `tree:${treeId}` channel with de-duped `senderClientId` envelopes and last-write-wins per field
  4. If my socket drops for >5s a disconnect banner appears and clears on reconnect; Clerk token refreshes on the Realtime socket every ~60s so I never get stuck in a 401 reconnect storm
  5. A Playwright E2E (sign in → new tree → add parent → edit name → undo → Tidy → share → accept invite in second browser context) passes green on a Vercel deploy with Clerk + Supabase env vars configured
**Plans:** TBD
**UI hint:** yes
**Research flags:** Realtime lifecycle and RLS re-audit under sharing scenarios must be explored during phase planning. Three specific areas need deeper research: (a) channel subscription authorization once multiple `tree_members` roles exist (viewer RLS must block write broadcasts even if client-sent), (b) reconnect storm handling when Clerk tokens expire mid-edit and `supabase.realtime.setAuth()` timing edge cases, and (c) whether to supplement broadcast-only sync with `broadcast-from-database` for late joiners. A full RLS re-audit against the new `tree_members.role` + `invites` flows is mandatory before launch. Per PITFALLS #6, #7, #8, #9, #10 and SUMMARY gaps.

## Phase Dependencies

```
Phase 1 (Foundation)
   ↓
Phase 2 (Canvas, Nodes & Edit)
   ↓
Phase 3 (Authoring & History)
   ↓
   ├──→ Phase 4 (Tidy & Layout)
   │       ↓
   └──→ Phase 5 (Share & Realtime)  ← may begin planning in parallel with Phase 4
```

Phase 4 depends only on Phase 3 (needs edges + history). Phase 5 depends on Phase 3 (share modal UX uses toolbar/toast infra) but not on Phase 4 — Tidy and Share/Realtime are independent features that can be planned in parallel once authoring is complete. Implementation order locks Tidy before Share so that multiplayer amplifies a polished single-user experience.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/4 | Planned | — |
| 2. Canvas, Nodes & Edit | 0/TBD | Not started | — |
| 3. Authoring & History | 0/TBD | Not started | — |
| 4. Tidy & Layout | 0/TBD | Not started | — |
| 5. Share & Realtime | 0/TBD | Not started | — |

## Coverage

- **Total v1 requirements:** 106
- **Mapped to phases:** 106 (100%)
- **Orphaned:** 0
- **Duplicated:** 0

See REQUIREMENTS.md Traceability section for the per-REQ mapping.

---
*Roadmap created: 2026-04-21. Granularity: coarse. Parallelization: enabled (Phase 4 and Phase 5 planning can overlap once Phase 3 is complete).*
