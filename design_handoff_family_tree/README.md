# Handoff: Family Tree App

## Overview

A collaborative, multi-generational family tree web app. Users sign in, land on a pan/zoom canvas showing their family, and can add relatives (parent, spouse, child, sibling) inline via a radial menu. Each person has a detail side panel. Trees can be shared with other family members (edit/view), and optionally kept in sync with a linked Google Sheet. The target feel is **a focused canvas tool** — something between Figma's infinite canvas and a lightweight CRM — not a dense genealogy database.

## About the Design Files

The files in `Family Tree.html` and `source/` are **design references created in HTML/React** — a working prototype showing intended look, flows, and interactions. They are **not** production code to copy directly.

Your task is to recreate these designs in the target codebase's existing environment (we assume Next.js + TypeScript + a real auth + persistence layer) using its established component patterns, state management, and styling conventions. If there is no existing environment yet, pick an appropriate modern stack (Next.js 14 App Router + TypeScript + Tailwind + a real graph-layout lib).

The prototype uses inline Babel-transpiled JSX and in-memory state; all of that needs to become real.

## Fidelity

**High-fidelity.** Colors, typography, spacing, and interactions are close to final. Recreate the UI pixel-for-pixel using the codebase's existing libraries. The only deliberately handwavy areas are:

- **Auto-layout** — the prototype uses a simple collision-nudge on add and a "Tidy" button that runs a Reingold–Tilford-ish heuristic. **Replace with a real graph layout library** (`dagre`, `elkjs`, or `d3-hierarchy` — see "Known Limitations").
- **Persistence** — prototype is local React state only. Wire to a real backend.
- **Auth** — sign-in UI is mocked. Wire to NextAuth / Clerk / Supabase.
- **Google Sheets sync** — the drawer UI is complete; the actual sync is stubbed with a fake "last synced 2 min ago" status.

## Screens / Views

### 1. Sign-in screen (`login.jsx`)

- **Purpose**: First-time landing / unauthenticated view.
- **Layout**: Full-viewport split. Left panel (~45%): centered sign-in card on cream background (`--bg`). Right panel (~55%): decorative preview of a stylized family tree on a slightly darker cream (`--bg-soft`), with a subtle grain/paper texture.
- **Sign-in card**: Logotype + tagline at top, then three buttons stacked (Continue with Google, Continue with Apple, Continue with email). Fine-print legal line at the bottom. Card has no container chrome — just type on the background.
- **Google button**: White fill, 1px rule border, Google G icon left, "Continue with Google" text.
- **Behavior**: Any button click calls `onSignIn()` which sets `signedIn=true` in the parent; no real auth. The right-panel illustration is static SVG.

### 2. Main canvas (`app.jsx`)

This is the core screen. Everything else overlays it.

- **Topbar** (fixed, 56px, `--bg`): Left = logotype + current tree name (editable inline). Center = breadcrumb / current-person indicator. Right = Share button (primary), avatar stack of collaborators, user menu.
- **Canvas** (fills remaining viewport): Infinite pan/zoom surface. Background is `--bg` with a very faint dot grid (8px spacing, `--ink-4` at 10% opacity). Pan = drag empty space. Zoom = ⌘+scroll or toolbar. Nodes render as React-positioned divs on a transformed parent (`translate(x,y) scale(k)`).
- **Person node** (`PersonNode` in `components.jsx`): 180×76px card. White fill, 1px `--rule` border, 8px radius, subtle shadow. Avatar circle (40px) left, name + birth–death years right. Male/female/nonbinary accent stripe on left edge (4px wide). Hover: shadow lifts, border darkens. Selected: 2px `--accent` border. The selected node shows a small **+** button anchored to its bottom-right that opens the radial menu.
- **Edges**: SVG paths drawn under the node layer. Spouse = horizontal line between two nodes at same y. Parent–child = orthogonal path (down from parent-pair midpoint, then across, then down into child). Line color `--rule`, 1.5px.
- **Bottom toolbar** (floating pill, bottom-center): Undo, Redo, Zoom-out, zoom %, Zoom-in, Fit-to-view, ✨ Tidy layout, Details panel toggle. Dark fill (`--ink-1`), white icons, 16px radius.
- **Toast** (bottom-center, above toolbar): Transient status messages ("Added parent", "Tidied layout", "Centered on …"). Auto-dismiss after 2.2s.

### 3. Radial add menu (`RadialMenu` in `components.jsx`)

- **Trigger**: Click the **+** on a selected node.
- **Shape**: 4 pie-slice buttons arranged in a circle around the anchor point (top=Parent, right=Spouse, bottom=Child, left=Sibling). 140px diameter. Each slice has an icon + label. Hover: slice fills with `--accent-soft`, icon/label darken. Click: calls `addRelative(anchorId, kind)` and closes.
- **Behavior**: Click outside or press Esc to dismiss. Only one radial open at a time.

### 4. Person side panel (`SidePanel` in `components.jsx`)

- **Trigger**: Double-click a node, press Enter while a node is selected, or toggle from toolbar.
- **Layout**: Right-docked drawer, 380px wide, full viewport height. White fill, left edge is 1px `--rule`.
- **Header**: "Person · ab12cd" (mono, uppercase, `--ink-3`) + **Saved / Auto-saves pill** (see Auto-save Indicator below) on one row. Large person name below. X close button top-right.
- **Sections** (dividers between):
  1. **Identity** — Name input, gender select (male/female/nonbinary/unknown), pronouns free-text.
  2. **Life** — Birth year, death year, birth place, notes textarea.
  3. **Relationships** — Read-only list. "Parents: Dave Chan, Mary Chan"; "Spouse: Katherine Zabihaylo"; "Children: Oliver, Lucy". Each name is clickable → selects that person and recenters.
  4. **Actions** — "Center on this person" button; "Remove" button (red text, not destructive-filled). Self-person hides Remove.
  5. **Footer bar**: "Changes save automatically" hint (mono, small) + "Done" primary button that closes the panel.
- **Auto-save indicator**: A pill in the header. Default state: gray border, gray dot, text "Auto-saves". When any field changes, switches to green for ~1.4s: green border, green dot, text "Saved". Transitions via CSS (200ms ease on colors).

### 5. Share modal (`ShareModal` in `share.jsx`)

- **Trigger**: Share button in topbar.
- **Shape**: Centered modal, 520px wide, rounded 12px, white fill, 32px padding, backdrop blur + dim.
- **Header**: "Share this tree" + subtitle "Invite family members to view or edit".
- **Invite row**: Email input + role dropdown (Editor / Viewer) + "Invite" button.
- **People list**: Rows for each invitee. Avatar circle + email + role dropdown + status badge (Active/Pending) + remove X. Current user row shows "(you)" and is non-removable.
- **Link sharing**: Toggle "Anyone with the link can view" with copy-link button below when enabled.
- **Footer**: Close button.

### 6. Google Sheets sync drawer (`SheetDrawer` in `share.jsx`)

- **Trigger**: "Sync with Google Sheets" button in share modal or from user menu.
- **Shape**: Bottom-docked drawer, full width, 320px tall, slides up. White fill.
- **Content**: Status line ("Linked to sheet · Last synced 2 min ago"), button "Sync now", button "Open sheet" (ext link icon), button "Unlink". Small table showing mapping of person fields → sheet columns (name, birthYear, deathYear, …).

## Interactions & Behavior

### Selection
- Click a node → select (blue border). Click again → deselect.
- Click empty canvas → deselect & close radial/panel.
- Esc → deselect everything.

### Drag
- Drag a node to reposition. On mouseup, commit to history.
- Dragging is in canvas-space, so it respects zoom.

### Add relative
- Open radial on a node, pick kind. New person is created adjacent to the anchor (spouse to right, parent above, child below, sibling to left).
- Simple collision-nudge: if another node is within node-width + 32px on the same row, new node shifts in the appropriate direction until clear.
- Selection moves to new node, side panel auto-opens, name field auto-focused.

### Tidy layout
- Toolbar ✨ button runs `FamilyModel.layoutTree(people)` which performs a top-down, bottom-up layered layout (generations as rows, subtree-width computation, parent centered over children span). Commits to history so it can be undone.

### Undo/redo
- ⌘Z / ⌘⇧Z (and ⌘Y). Full-state history (array of `people` snapshots). Every structural change commits.

### Pan/zoom
- Pan: drag empty canvas. Zoom: ⌘+scroll or toolbar. Fit: toolbar button resets to `{x:400, y:180, k:1}`.

### Keyboard
- Enter on selected → open side panel.
- Esc → close everything.
- ⌘Z / ⌘⇧Z → undo/redo.

## State Management

### People array (the core)

```ts
type Gender = 'm' | 'f' | 'x' | 'u';

type Person = {
  id: string;              // uid()
  name: string;
  gender: Gender;
  pronouns?: string;
  birthYear?: number | null;
  deathYear?: number | null;
  birthPlace?: string;
  notes?: string;
  spouseIds: string[];
  parentIds: string[];     // 0–2
  childIds: string[];
  x: number;               // canvas position
  y: number;
  isMe?: boolean;          // anchor for "center on me"
};
```

Edges are **derived** from relationship arrays via `computeEdges(people)` — never stored. See `model.jsx`.

### App state
- `people: Person[]` — source of truth.
- `history: Person[][]`, `hIndex: number` — for undo.
- `selectedId: string | null`.
- `sidePanelOpen: boolean`.
- `radial: { personId, x, y } | null`.
- `transform: { x, y, k }` — pan/zoom.
- `toast: string | null`.
- `shareOpen, sheetDrawerOpen: boolean`.
- `invites: Invite[]` — placeholder.
- `lastSavedAt: number | null` — drives the Saved pill animation.

For the real app: move `people` into a server-persisted store (Postgres with a `people` and `relationships` join table, or just a JSON blob per tree for v1). `history` can stay client-side.

## Design Tokens

All defined in `styles.css` as CSS variables under `:root`.

### Colors
```
--bg:           #F7F4EC    /* warm cream */
--bg-soft:      #EFEAD8    /* slightly darker */
--bg-card:      #FFFFFF
--ink-1:        #1A1814    /* near-black body */
--ink-2:        #4B4740    /* secondary text */
--ink-3:        #8A857A    /* tertiary/meta */
--ink-4:        #C6C0B1    /* faint */
--rule:         #DCD6C5    /* borders */
--rule-soft:    #E8E3D3    /* subtle dividers */
--accent:       #2E5A3E    /* deep green selection/primary */
--accent-soft:  oklch(0.92 0.05 150)
--success:      #3B7A4D
--danger:       #A44A3F
--warn:         #C48A2E
```

### Typography
- Body/UI: `Inter`, 400/500/600/700.
- Mono (meta, IDs, timestamps): `JetBrains Mono`, 400/500.
- Scale: 10 (mono meta), 11, 12, 13 (body), 14, 16 (input), 18 (panel title), 22, 28, 36 (headline).
- Letter-spacing: `-0.015em` on display, `0.08em` uppercase on meta.
- Line-height: 1.45 body, 1.15 display.

### Spacing
- 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 56. Prefer multiples of 4.

### Radius
- 2 (subtle), 4, 6, 8 (cards), 12 (modals), 16 (toolbar pill), 999 (pills/avatars).

### Shadow
- Card rest: `0 1px 2px rgba(20,18,14,0.04), 0 1px 0 rgba(20,18,14,0.02)`.
- Card hover: `0 4px 12px rgba(20,18,14,0.08)`.
- Modal: `0 20px 60px rgba(20,18,14,0.18)`.

### Node geometry
- `NODE_W = 180`, `NODE_H = 76`. Horizontal gap between siblings: 40. Couple gap (spouse-spouse): 24. Vertical gap between generations: 120.

## Assets

- **Icons** are all inline SVG in `icons.jsx`. Replace with `lucide-react` 1:1 — every icon has a direct Lucide equivalent (User, Plus, Minus, X, Check, Undo2, Redo2, Maximize2, Sparkles, Share2, Trash2, ExternalLink, …).
- **Google G** logo in the sign-in button is a multi-path SVG; keep as-is (it's the official mark).
- **No raster images** used. The sign-in right-panel illustration is hand-drawn inline SVG.

## Known Limitations (things to fix in the real build)

1. **Auto-layout is heuristic.** The `layoutTree` function in `model.jsx` works for simple trees but breaks on complex families (multiple marriages, step-children, cousins). **Replace with `dagre` or `elkjs`**, treating couples as merged nodes and children as edges from the couple-node. Reingold–Tilford via `d3-hierarchy` also works if you don't need marriage-aware layout. Keep the "Tidy" button as the user-triggered entry point.
2. **No real auth.** Wire to whatever the codebase uses.
3. **No persistence.** Needs a backend with optimistic UI + conflict resolution (CRDT-lite is probably overkill for v1 — last-write-wins per field is fine).
4. **Collaborators are mocked.** Real presence (who's viewing, cursor positions) is out of scope for v1 but the UI has hooks for it (avatar stack in topbar).
5. **Sheets sync is stubbed.** The drawer is designed; the sync itself needs the Google Sheets API + OAuth scope.
6. **Accessibility pass needed.** Canvas interactions need keyboard equivalents (arrow keys to traverse siblings/generations, Tab to cycle focusable nodes). Radial menu needs screen-reader labels.

## Files

- `Family Tree.html` — the working prototype. Open in a browser to interact.
- `source/app.jsx` — top-level component, canvas, pan/zoom, history, keyboard.
- `source/components.jsx` — `PersonNode`, `RadialMenu`, `SidePanel`.
- `source/share.jsx` — `ShareModal`, `SheetDrawer`.
- `source/login.jsx` — sign-in screen.
- `source/model.jsx` — `Person` shape, sample data, edge computation, `layoutTree`.
- `source/icons.jsx` — icon set.
- `source/styles.css` — all design tokens + component styles.

## Suggested Implementation Order

1. **Data model + auth** — set up DB schema, auth, tree creation/load.
2. **Canvas + nodes, static** — render `PersonNode`s at stored x/y, pan/zoom, no editing. This validates the rendering pipeline.
3. **Selection + side panel** — add edit/save for person fields.
4. **Edges** — implement `computeEdges` + SVG rendering.
5. **Add-relative + radial menu** — structural mutations.
6. **Undo/redo + auto-save indicator**.
7. **Tidy layout** — swap in dagre/elkjs.
8. **Share modal + collaborators**.
9. **Sheets sync** (optional, last).

Ship steps 1–6 as v1; 7–9 are enhancements.
