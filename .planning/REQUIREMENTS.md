# Requirements: CZ Family Tree

**Defined:** 2026-04-21
**Core Value:** A person can open the app, see their family laid out on a clean canvas, and add/edit relatives without friction. If the canvas + radial-add loop doesn't feel effortless, nothing else matters.

## v1 Requirements

### Authentication & Tree Ownership

- [x] **AUTH-01**: User can sign in with Google via Clerk
- [x] **AUTH-02**: User can sign in with Apple via Clerk
- [x] **AUTH-03**: User can sign in with email (magic link or code) via Clerk
- [x] **AUTH-04**: Sign-in screen matches handoff design pixel-for-pixel (split layout, cream backgrounds, 3-button stack, static illustration)
- [x] **AUTH-05**: Authenticated session persists across browser refresh
- [x] **AUTH-06**: User can sign out from the user menu
- [x] **TREE-01**: On first sign-in, user auto-lands in a freshly created empty tree with a seed "You" node
- [x] **TREE-02**: User can create a new tree and name it inline from the topbar
- [x] **TREE-03**: User can switch between trees they own or have been invited to
- [x] **TREE-04**: Tree is private to owner + invited members (enforced by Supabase RLS using `auth.jwt()->>'sub'`)

### Data Model & Persistence

- [x] **DATA-01**: `people` table stores `id, tree_id, name, gender, pronouns, birth_year, death_year, birth_place, notes, spouse_ids[], parent_ids[], child_ids[], x, y, is_me, created_at, updated_at`
- [x] **DATA-02**: `trees` table stores `id, name, owner_id, created_at, updated_at`
- [x] **DATA-03**: `tree_members` table stores `tree_id, user_id (text, Clerk sub), role (owner/editor/viewer), status (active/pending), created_at`
- [x] **DATA-04**: `invites` table stores `id, tree_id, email, role, status (pending/accepted/revoked), token, expires_at`
- [x] **DATA-05**: RLS policies enforce tree access via `SECURITY DEFINER` helper `user_tree_ids(uid text)` to avoid cross-table recursion
- [x] **DATA-06**: `parent_ids` constrained to max 2 entries; CHECK constraint rejects self-parent (`id = ANY(parent_ids)`)
- [x] **DATA-07**: Cycle-detection walk runs server-side on any relationship mutation; mutation rejected if it creates a cycle
- [x] **DATA-08**: GIN indexes on `spouse_ids`, `parent_ids`, `child_ids` for relationship lookups
- [x] **DATA-09**: Unique partial index enforces one `is_me=true` person per tree per user
- [x] **DATA-10**: `people.id` is a UUID generated client-side (`uid()`) and accepted by the server (matches handoff model)

### Canvas & Rendering

- [ ] **CANV-01**: Canvas fills viewport below the 52px topbar; pans via drag-empty-space; zooms via ⌘+scroll or toolbar buttons
- [ ] **CANV-02**: Background renders faint dot grid (24px spacing, `--rule-soft`)
- [ ] **CANV-03**: Pan/zoom implemented via single CSS `translate(x,y) scale(k)` wrapper; all drag deltas divide by `k` for canvas-space correctness
- [ ] **CANV-04**: Wheel handler registered via `addEventListener('wheel', h, {passive:false})`; macOS trackpad pinch (wheel+ctrlKey) handled
- [ ] **CANV-05**: Fit-to-view button resets transform to `{x:400, y:180, k:1}`
- [ ] **CANV-06**: Zoom range clamped to `[0.25, 4]`; zoom anchors to pointer position when using wheel
- [ ] **NODE-01**: `PersonNode` renders at stored `x, y`: 180×76px white card, 1px `--rule` border, 8px radius, shadow
- [ ] **NODE-02**: Node shows 40px avatar circle (initials) + name + birth–death years
- [ ] **NODE-03**: Node has 4px gender accent stripe on left edge (male/female/nonbinary/unknown colors)
- [ ] **NODE-04**: Hover state: shadow lifts, border darkens
- [ ] **NODE-05**: Selected state: 2px `--accent` border + visible `+` button anchored bottom-right
- [ ] **NODE-06**: User can drag a node to reposition (canvas-space, respects zoom); mouseup commits to history
- [ ] **EDGE-01**: `computeEdges(people)` pure function derives edges from relationship arrays — edges never stored
- [ ] **EDGE-02**: Single `<svg>` overlay beneath node layer renders all edges (not one SVG per edge)
- [ ] **EDGE-03**: Spouse edges render as horizontal lines between nodes at same y
- [ ] **EDGE-04**: Parent–child edges render as orthogonal paths (down from parent-pair midpoint, across, down into child)
- [ ] **EDGE-05**: Edges use `--rule` color at 1.5px with `vector-effect="non-scaling-stroke"` (constant width under zoom)
- [ ] **EDGE-06**: Renders 200 nodes + edges at 60fps on a modern laptop

### Selection & Side Panel

- [ ] **SEL-01**: Click a node selects it (blue border); click same node deselects; click empty canvas deselects everything
- [ ] **SEL-02**: Esc key deselects and closes radial / side panel
- [ ] **SEL-03**: Enter key on selected node opens the side panel
- [ ] **PANEL-01**: Double-click a node opens the side panel; toolbar panel-toggle button also opens/closes it
- [ ] **PANEL-02**: Side panel is right-docked, 380px wide, full viewport height, white fill, 1px `--rule` left edge
- [ ] **PANEL-03**: Header shows "Person · [id6]" (mono uppercase) + Saved/Auto-saves pill + X close button
- [ ] **PANEL-04**: Identity section: Name input, gender select (m/f/x/u), pronouns free-text
- [ ] **PANEL-05**: Life section: Birth year, death year, birth place, notes textarea
- [ ] **PANEL-06**: Relationships section: read-only list (Parents / Spouse / Children) with clickable names that select+recenter
- [ ] **PANEL-07**: Actions section: "Center on this person" button; "Remove" button (red text, confirms via modal before delete)
- [ ] **PANEL-08**: Self-person row hides the Remove action (cannot delete the "is_me" node)
- [ ] **PANEL-09**: Footer: "Changes save automatically" hint + Done primary button that closes the panel
- [ ] **SAVE-01**: Field edits debounced ~250–500ms, persisted via Server Action
- [ ] **SAVE-02**: Auto-save pill state machine: `idle → dirty → saving → saved | error` — pill flips green ONLY on server ACK
- [ ] **SAVE-03**: Pill stays green ~1.4s after save, then returns to neutral "Auto-saves" state
- [ ] **SAVE-04**: On save error, pill shows red + "Couldn't save" toast with Retry; saves queue serially per person to prevent request reordering

### Add-Relative & Radial Menu

- [ ] **RAD-01**: Clicking `+` on a selected node opens a 140px radial menu with 4 pie slices (Parent top, Spouse right, Child bottom, Sibling left)
- [ ] **RAD-02**: Each slice shows icon + label; hover fills with `--accent-soft`
- [ ] **RAD-03**: Click outside or Esc dismisses radial; only one radial open at a time
- [ ] **ADD-01**: Picking a relative kind creates a new person adjacent to the anchor (spouse right, parent above, child below, sibling left)
- [ ] **ADD-02**: Collision-nudge shifts the new node if another node is within `NODE_W + 32px` on the same row (bounded iterations)
- [ ] **ADD-03**: New person is immediately selected, side panel auto-opens, Name field auto-focused
- [ ] **ADD-04**: Relationship patches are symmetric (adding Bob as Alice's spouse also adds Alice to Bob's `spouse_ids`), committed in a single server action

### Undo/Redo & History

- [ ] **HIST-01**: ⌘Z / Ctrl-Z undoes the last structural change; ⌘⇧Z / ⌘Y redoes
- [ ] **HIST-02**: History implemented with `zundo` temporal middleware on the Zustand store using Immer patches (not full snapshots)
- [ ] **HIST-03**: History cap at 100 commits; older entries dropped
- [ ] **HIST-04**: Undo/redo shortcut scope-aware: ignored when focus is in an input/textarea that handles its own undo
- [ ] **HIST-05**: Drag, field edit (on blur), add-relative, remove-person, and Tidy all commit exactly one history entry

### Toolbar, Toasts, Search

- [ ] **TOOL-01**: Bottom floating toolbar (pill, dark `--ink-1` fill, 16px radius): Undo, Redo, Zoom-out, Zoom %, Zoom-in, Fit, ✨ Tidy, Panel toggle
- [ ] **TOOL-02**: Toolbar buttons show disabled state when action unavailable (e.g., Undo disabled when history empty)
- [ ] **TOAST-01**: Transient toast renders bottom-center above toolbar; auto-dismiss after 2.2s; messages include "Added parent", "Tidied layout", "Centered on …", "Couldn't save"
- [ ] **SRCH-01**: ⌘K / ⌘F opens a search palette listing all people in the current tree by name
- [ ] **SRCH-02**: Selecting a result selects the person and recenters the canvas on them; closes palette

### Tidy Layout (dagre)

- [ ] **TIDY-01**: Toolbar ✨ button runs `layoutTidy(people)` using `@dagrejs/dagre@3`
- [ ] **TIDY-02**: Couples are merged into synthetic nodes (width `2×NODE_W + 24`) before layout; children are edges from the couple-node
- [ ] **TIDY-03**: After layout, synthetic couple-nodes are split back into two `PersonNode` positions
- [ ] **TIDY-04**: Tidy commits one history entry; toast shows "Tidied layout · ⌘Z to restore"
- [ ] **TIDY-05**: Transition animates node positions over ~300ms

### Share Modal & Collaborators

- [ ] **SHARE-01**: Share button in topbar opens a centered modal (520px, white fill, backdrop blur/dim)
- [ ] **SHARE-02**: Invite row: Email input + role dropdown (Editor/Viewer) + Invite button creates a pending invite
- [ ] **SHARE-03**: People list shows current members: avatar + email + role dropdown + status badge (Active/Pending) + remove X
- [ ] **SHARE-04**: Current user row shows "(you)" and is non-removable
- [ ] **SHARE-05**: Role change updates `tree_members.role` via server action
- [ ] **SHARE-06**: "Anyone with the link can view" toggle; copy-link button appears when enabled
- [ ] **SHARE-07**: Inviting an email generates an invite record; v1 displays the invite URL in the modal for the owner to copy and send manually (email delivery deferred to v1.x)
- [ ] **SHARE-08**: Acceptance URL signs the invitee in via Clerk, creates/matches `tree_members` row, redirects to `/tree/[treeId]`

### Real-time Collaboration

- [ ] **RT-01**: One Supabase Realtime channel per open tree: `tree:${treeId}`
- [ ] **RT-02**: Channel carries presence payload `{ userId, name, avatarUrl, cursor: {x,y} | null }`
- [ ] **RT-03**: Topbar shows avatar stack of currently-present collaborators (max 5 visible + overflow indicator)
- [ ] **RT-04**: Live cursor renders for each other presence (not self); cursor broadcast throttled to 100ms
- [ ] **RT-05**: Edit broadcasts typed envelope: `person_update | person_move | structural`
- [ ] **RT-06**: Drag broadcasts throttled to ~30Hz; field edits debounced 250–500ms
- [ ] **RT-07**: Client de-dupes echoes via `senderClientId` in broadcast payload
- [ ] **RT-08**: Channel subscribed on mount, torn down via `supabase.removeChannel` on unmount
- [ ] **RT-09**: Clerk token refreshed on the Realtime socket every ~60s via `supabase.realtime.setAuth(token)`
- [ ] **RT-10**: Disconnect banner appears if socket drops for >5s; clears when reconnected

### Error Handling, A11y, Design Fidelity

- [ ] **ERR-01**: Save failure shows toast + marks pill red; retry available
- [ ] **ERR-02**: Realtime disconnect banner visible across all views while disconnected
- [ ] **A11Y-01**: All interactive controls have focus rings and ARIA labels
- [ ] **A11Y-02**: Keyboard shortcut scope is correct (typing in a field does not trigger canvas Cmd-Z)
- [ ] **A11Y-03**: Tab order: topbar → canvas container → toolbar → side panel (when open)
- [ ] **DESIGN-01**: Colors, typography, spacing, radii, shadows match design tokens in handoff `styles.css` exactly
- [ ] **DESIGN-02**: Inline icons replaced 1:1 with `lucide-react` equivalents (User, Plus, X, Undo2, Redo2, Maximize2, Sparkles, Share2, Trash2, ExternalLink, …)
- [x] **DESIGN-03**: Tailwind v4 `@theme` maps handoff `:root` CSS variables directly (no drift between prototype and app)

### Testing & Deploy

- [ ] **TEST-01**: Vitest unit tests cover `computeEdges`, `collisionNudge`, `layoutTidy` adapter, history reducers, cycle detection
- [ ] **TEST-02**: Playwright E2E covers: sign in → new tree → add parent → edit name → undo → Tidy → share → accept invite in second browser context
- [ ] **DEP-01**: Deployed to Vercel with Clerk + Supabase env vars configured
- [x] **DEP-02**: Next.js version pinned ≥ Next 16 (avoids CVE-2025-29927 and matches Clerk 7 requirements)

## v2 Requirements

Deferred to future release. Tracked but not in v1 roadmap.

### Google Sheets Sync

- **SHEETS-01**: Sheet drawer UI (already designed in handoff)
- **SHEETS-02**: OAuth + Google Sheets API integration
- **SHEETS-03**: Two-way sync with mapping person fields ↔ sheet columns
- **SHEETS-04**: Manual "Sync now" + "Unlink" controls

### Enhanced Collaboration

- **COLLAB-01**: Email delivery of invites (Resend or Clerk transactional)
- **COLLAB-02**: Pinned comments on nodes
- **COLLAB-03**: Activity feed per tree (who edited what, when)
- **COLLAB-04**: Version history / named snapshots per tree

### Richer Person Data

- **RICH-01**: Photo upload per person (Supabase Storage)
- **RICH-02**: Right-click context menu on nodes (faster ops without opening side panel)
- **RICH-03**: Duplicate-person action
- **RICH-04**: Step / adoptive relationship types (promote `parent_ids[]` array to `relationships(tree_id, a_id, b_id, kind, lineage_type)` table)

### Expanded Canvas

- **CANV-v2-01**: Full canvas keyboard nav (arrow keys traverse siblings/generations, Tab cycles focusable nodes)
- **CANV-v2-02**: Minimap for orientation on large trees
- **CANV-v2-03**: PNG/PDF export of current viewport
- **CANV-v2-04**: GEDCOM *export* (not import)
- **CANV-v2-05**: Read-only responsive mobile view

## Out of Scope

Explicit exclusions. These contradict Core Value or push the product into the wrong category.

| Feature | Reason |
|---------|--------|
| GEDCOM import | Pulls into "Ancestry competitor" category; product is canvas-first, not genealogy-database |
| DNA integration / ethnicity estimates | Anti-feature; database-category signal |
| Record hints / Smart Matches / shared-world tree | Anti-feature; requires corpus + matching engine out of product scope |
| Source citations system | Signals "database" and contradicts minimal side panel |
| Fan / pedigree / kinship chart alternate views | Canvas view is the single view; alternate chart types fragment the UX |
| CRDT conflict resolution | Last-write-wins per field sufficient for family-tree concurrency pressure |
| Public SEO-indexed trees | Privacy concern + not the product we're building |
| Mobile-polished canvas interactions | Desktop-first for v1; mobile is usable-but-not-polished |
| Arrow-key canvas traversal between nodes | Deferred to v2 to stay focused on mouse+keyboard-shortcut flow in v1 |
| React Flow / react-zoom-pan-pinch | Libraries fight the handoff's `translate(x,y) scale(k)` wrapper model; custom transform is ~120 LOC |
| Postgres CDC (postgres_changes) for sync | Realtime broadcast channel + optimistic local is the chosen pattern; CDC is too slow + RLS-per-row too costly |
| Real-time chat / messaging inside the app | Out of category; focus is family-tree authoring, not communication |

## Traceability

Every v1 requirement maps to exactly one phase. See ROADMAP.md for phase goals and success criteria.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| TREE-01 | Phase 1 | Complete |
| TREE-02 | Phase 1 | Complete |
| TREE-03 | Phase 1 | Complete |
| TREE-04 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Complete |
| DATA-07 | Phase 1 | Complete |
| DATA-08 | Phase 1 | Complete |
| DATA-09 | Phase 1 | Complete |
| DATA-10 | Phase 1 | Complete |
| DESIGN-03 | Phase 1 | Complete |
| DEP-02 | Phase 1 | Complete |
| CANV-01 | Phase 2 | Pending |
| CANV-02 | Phase 2 | Pending |
| CANV-03 | Phase 2 | Pending |
| CANV-04 | Phase 2 | Pending |
| CANV-05 | Phase 2 | Pending |
| CANV-06 | Phase 2 | Pending |
| NODE-01 | Phase 2 | Pending |
| NODE-02 | Phase 2 | Pending |
| NODE-03 | Phase 2 | Pending |
| NODE-04 | Phase 2 | Pending |
| NODE-05 | Phase 2 | Pending |
| NODE-06 | Phase 2 | Pending |
| EDGE-01 | Phase 2 | Pending |
| EDGE-02 | Phase 2 | Pending |
| EDGE-03 | Phase 2 | Pending |
| EDGE-04 | Phase 2 | Pending |
| EDGE-05 | Phase 2 | Pending |
| EDGE-06 | Phase 2 | Pending |
| SEL-01 | Phase 2 | Pending |
| SEL-02 | Phase 2 | Pending |
| SEL-03 | Phase 2 | Pending |
| PANEL-01 | Phase 2 | Pending |
| PANEL-02 | Phase 2 | Pending |
| PANEL-03 | Phase 2 | Pending |
| PANEL-04 | Phase 2 | Pending |
| PANEL-05 | Phase 2 | Pending |
| PANEL-06 | Phase 2 | Pending |
| PANEL-07 | Phase 2 | Pending |
| PANEL-08 | Phase 2 | Pending |
| PANEL-09 | Phase 2 | Pending |
| SAVE-01 | Phase 2 | Pending |
| SAVE-02 | Phase 2 | Pending |
| SAVE-03 | Phase 2 | Pending |
| SAVE-04 | Phase 2 | Pending |
| ERR-01 | Phase 2 | Pending |
| DESIGN-01 | Phase 2 | Pending |
| DESIGN-02 | Phase 2 | Pending |
| RAD-01 | Phase 3 | Pending |
| RAD-02 | Phase 3 | Pending |
| RAD-03 | Phase 3 | Pending |
| ADD-01 | Phase 3 | Pending |
| ADD-02 | Phase 3 | Pending |
| ADD-03 | Phase 3 | Pending |
| ADD-04 | Phase 3 | Pending |
| HIST-01 | Phase 3 | Pending |
| HIST-02 | Phase 3 | Pending |
| HIST-03 | Phase 3 | Pending |
| HIST-04 | Phase 3 | Pending |
| HIST-05 | Phase 3 | Pending |
| TOOL-01 | Phase 3 | Pending |
| TOOL-02 | Phase 3 | Pending |
| TOAST-01 | Phase 3 | Pending |
| SRCH-01 | Phase 3 | Pending |
| SRCH-02 | Phase 3 | Pending |
| A11Y-01 | Phase 3 | Pending |
| A11Y-02 | Phase 3 | Pending |
| A11Y-03 | Phase 3 | Pending |
| TIDY-01 | Phase 4 | Pending |
| TIDY-02 | Phase 4 | Pending |
| TIDY-03 | Phase 4 | Pending |
| TIDY-04 | Phase 4 | Pending |
| TIDY-05 | Phase 4 | Pending |
| SHARE-01 | Phase 5 | Pending |
| SHARE-02 | Phase 5 | Pending |
| SHARE-03 | Phase 5 | Pending |
| SHARE-04 | Phase 5 | Pending |
| SHARE-05 | Phase 5 | Pending |
| SHARE-06 | Phase 5 | Pending |
| SHARE-07 | Phase 5 | Pending |
| SHARE-08 | Phase 5 | Pending |
| RT-01 | Phase 5 | Pending |
| RT-02 | Phase 5 | Pending |
| RT-03 | Phase 5 | Pending |
| RT-04 | Phase 5 | Pending |
| RT-05 | Phase 5 | Pending |
| RT-06 | Phase 5 | Pending |
| RT-07 | Phase 5 | Pending |
| RT-08 | Phase 5 | Pending |
| RT-09 | Phase 5 | Pending |
| RT-10 | Phase 5 | Pending |
| ERR-02 | Phase 5 | Pending |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |
| DEP-01 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 106 total
- Mapped to phases: 106 (100%)
- Unmapped: 0
- Duplicated: 0

**Phase totals:**
- Phase 1 (Foundation): 22 requirements
- Phase 2 (Canvas, Nodes & Edit): 37 requirements
- Phase 3 (Authoring & History): 20 requirements
- Phase 4 (Tidy & Layout): 5 requirements
- Phase 5 (Share & Realtime): 22 requirements

---
*Requirements defined: 2026-04-21*
*Traceability populated by /gsd-roadmap: 2026-04-21*
*Last updated: 2026-04-21 after roadmap creation*
