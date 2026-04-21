# Feature Research

**Domain:** Collaborative family tree web app (canvas-first, not genealogy database)
**Researched:** 2026-04-21
**Confidence:** HIGH for table stakes / anti-features, MEDIUM for differentiators

## Positioning Reminder (Read This First)

Per PROJECT.md: "Target feel is **a focused canvas tool** — somewhere between Figma's
infinite canvas and a lightweight CRM — **not a dense genealogy database**." That sentence
is the single most important filter for this research. Ancestry / MyHeritage / FamilySearch
have enormous feature surfaces (DNA, historical records, hints, ethnicity estimates,
newspaper OCR, etc.) that are table stakes *in the genealogy-database category* but
**anti-features** for this product. The category we are competing in is closer to Figma /
FigJam / Miro / Whimsical applied to a family-relationship domain. Feature categorization
below reflects that.

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these will make the product feel broken, regardless of how good the canvas is.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pan/zoom infinite canvas | Every canvas product has it (Figma, Miro, FigJam, tldraw). Already in handoff. | MEDIUM | Handoff covers it. |
| Node render + selection | Baseline canvas interaction. Already in handoff. | LOW | — |
| Add relative inline (without page nav) | Canvas products let you create inline. Radial menu in handoff is the differentiator; inline-add itself is table stakes. | MEDIUM | Handoff covers it. |
| Side panel / inspector for details | Figma right panel, Miro right panel — every canvas tool has one. | LOW | Handoff covers it. |
| Undo / redo with ⌘Z / ⌘⇧Z | Non-negotiable. Any canvas tool without undo feels amateur. | MEDIUM | Handoff covers it. |
| Auto-save with indicator | Google Docs set this expectation. "Did my change save?" anxiety kills perceived quality. | LOW | Handoff covers it (Saved / Auto-saves pill). |
| Keyboard shortcuts (basic: Enter, Esc, ⌘Z) | Power users expect at minimum these. | LOW | Handoff covers it. |
| Fit-to-view / zoom controls | Toolbar expectation from Figma/Miro. | LOW | Handoff covers it. |
| Drag-to-reposition nodes | Users assume direct manipulation. Handoff covers it. | MEDIUM | Commits to history on mouseup. |
| Share with edit/view roles | Standard since Google Docs (2006). Handoff covers it. | MEDIUM | Handoff covers it. |
| Live presence (avatar stack, "who's here") | Expected since Figma made it famous. Handoff shows avatar stack. | MEDIUM | Handoff v1 includes it via Supabase Realtime. |
| Auth (Google / Apple / email) | Table stakes. Handoff covers it. | LOW | Clerk. |
| Persistence (survives refresh) | Not optional. | MEDIUM | Supabase Postgres + RLS. |
| Tidy / auto-layout button | Any graph-ish product has one; hand-placing 40 nodes is unreasonable. | HIGH | Handoff covers it (dagre swap). |
| **Delete / remove person with confirm** | Any CRUD expects delete. Handoff has "Remove" in side panel — confirm that destructive path is handled (soft-delete or confirmation). | LOW | **Verify UX: is there a confirm? What happens to dangling edges?** |
| **Loading states / empty states** | Empty "Your tree is empty" and skeleton loading aren't in the handoff explicitly. | LOW | Not in handoff — likely implicit but worth flagging. |
| **Error states (failed save, lost connection)** | Realtime/Supabase will drop; users need to know. | LOW | Not explicitly in handoff — add a reconnecting/"couldn't save" banner. |
| **Node hover / selection affordances** | Standard canvas polish. Handoff covers (shadow lifts, accent border). | LOW | — |

### Table Stakes the Handoff May Have Under-specified

Things the handoff mentions in passing or not at all, but which category peers all have and users will expect.

| Feature | Why Expected | Complexity | Handoff Status |
|---------|--------------|------------|----------------|
| **Search / find person in tree** | Trees grow past ~30 nodes and scrolling the canvas is painful. Figma has ⌘F, Miro has search, every genealogy app has search. | LOW | **Not in handoff.** Strong v1 recommendation — a ⌘K or ⌘F search that jumps+centers on a person. |
| **Node right-click / context menu** | Every canvas tool has right-click menus. Faster than opening side panel for common ops (add relative, remove, center on). | LOW | Not in handoff. v1.x candidate. |
| **Multi-select / marquee select** | Figma/Miro standard. Useful for bulk-move. | MEDIUM | Not in handoff. Probably v2 — family trees are hand-built, marquee is low-value. |
| **Duplicate / copy person** | Mistakes happen; re-typing is painful. | LOW | Not in handoff. v1.x. |
| **Validation: two parents max, no cycles** | Users will try to add a third parent, or make someone their own grandfather. Either block it or show warning. | MEDIUM | Handoff schema says `parentIds: 0–2` but no UI-level enforcement mentioned. v1 must handle gracefully. |
| **Mobile read-only / responsive view** | Users will open on phone to show relatives. Handoff says "desktop-first, mobile usable but not polished" — that's correct, but a passable read-only mobile view is table stakes. | MEDIUM | Explicitly out of scope in PROJECT.md. Re-flag for v1.x. |
| **Accessibility: focus ring, ARIA labels** | WCAG basics. Full keyboard nav is deferred, but focus rings + ARIA labels on interactive elements should be v1. | LOW | Partially deferred in PROJECT.md. Keep *basic* a11y (focus, labels) in v1. |

### Differentiators (Competitive Advantage)

Features that would make this app stand out vs. the genealogy giants *or* vs. generic canvas tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Radial add menu** (Parent / Spouse / Child / Sibling) | No genealogy product has this. Turns a 3-click "add person → pick relationship → fill form" into a 1-gesture flow. This is the product's signature. | MEDIUM | Already in handoff. **This is the core differentiator — protect it.** |
| **Canvas-first positioning** | Ancestry/MyHeritage/Geni are form-driven databases. Positioning the product as "Figma for your family" is the wedge. | — | Brand/positioning, not a feature. Reinforce through every interaction (infinite pan, no page reloads, keyboard-first). |
| **Live presence + multiplayer editing** | Genealogy products famously don't have this (Ancestry trees are effectively single-player; FamilySearch is shared but edits clash). Real-time multiplayer is a massive canvas-tool advantage. | MEDIUM-HIGH | Handoff includes via Supabase Realtime. Keep in v1. |
| **Google Sheets two-way sync** | No competitor offers this. Great for families who already track relatives in Sheets. | HIGH | Handoff UI is done; OAuth + sync engine is v2. Deferred correctly in PROJECT.md. |
| **Auto-layout (dagre couples-as-merged-nodes)** | Heredis/MacFamilyTree have this but buried. In a canvas-first UX with a ✨ button, it feels magical. | HIGH | Handoff covers it. |
| **Share-by-link with granular roles** | Figma-style sharing applied to family data. Ancestry invites are clunky; link-sharing feels modern. | MEDIUM | Handoff covers it. |
| **Clean visual design (design-tokens-first)** | Category peers look like 2010 (Ancestry, Geni, FamilySearch). Good type + restrained palette + real spacing is a real differentiator. | LOW-MEDIUM | Pixel-parity with handoff is the plan. Honor it. |
| "Center on me" anchor | `isMe` flag in schema. Onboarding hook: "Who are *you* in this tree?" Makes the first moment personal. | LOW | Handoff has it. v1. |
| Comments on nodes (FigJam-style pinned comments) | "Is this Grandma's maiden name right?" is a natural question. FigJam-style pinned comments fit the canvas metaphor perfectly. | MEDIUM | **Not in handoff.** Strong v1.x candidate — relatively cheap given Supabase is already there. |
| Activity feed / edit log | "Dad added 3 relatives last night" is a nice hook and a collaboration-trust feature. | MEDIUM | Not in handoff. v2. |
| Version history / named snapshots | "Restore to 2026-04-21" — cheap insurance against a relative misunderstanding and deleting half the tree. | MEDIUM | Not in handoff. v2 — but critical for Share with edit access. |
| Photo on person card | Every competitor has avatars. Handoff has avatar circles but not photo upload. A single photo per person (no gallery) is a strong v1.x differentiator. | MEDIUM | Not in handoff. v1.x. |
| Emoji / sticker reactions on person | FigJam-style lightweight reactions. Fun, low-effort family engagement. | LOW | Not in handoff. v2. |

### Anti-Features (Commonly Requested, Deliberately Avoided)

These are table stakes *for genealogy databases* and would be category-confusion here.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Historical records integration** (census, birth/death records, military) | "Ancestry has it." | Multi-year, multi-million-dollar licensing data moat. Scope creep into a category we've explicitly rejected. | Stay canvas-first. If a user wants records, they can paste notes. |
| **DNA integration / ethnicity estimates** | "MyHeritage has it." | Requires sample logistics, lab partners, regulatory (HIPAA-adjacent), and a whole product. | Hard no. Not our product. |
| **Smart Matches™ / record hints** | "MyHeritage / Ancestry show hints automatically." | Requires a corpus of other trees + records + ML infra. Two-year build minimum. | Potentially add a lightweight duplicate-person *within-tree* hint in v2 (much smaller scope). |
| **Duplicate-person detection across users' trees** | "FamilySearch / Geni do this." | Requires cross-tenant data access, de-duplication ML, and a merge workflow. Violates the "private tree until shared" model. | Offer within-tree duplicate hints only (same tree, similar name + life years). v2. |
| **Shared / one-world tree** (Geni / FamilySearch model) | "Only one tree of humanity." | Fundamentally different product and data model. Incompatible with "private until shared". Would require a governance system. | Keep per-user, per-tree with sharing. Hard no on shared-world tree. |
| **GEDCOM import/export** | "Industry standard for genealogy." | GEDCOM 7 is complex; covering edge cases (step-families, multiple marriages, sources) is weeks of work. GEDCOM is also an anti-signal — users bringing a GEDCOM are already *in* the genealogy-database mindset we're not serving. | Out of scope v1 (per PROJECT.md). Consider light GEDCOM *export* in v2 for lock-in avoidance; defer import to v3 or never. |
| **Source citations / footnotes per fact** | "Any serious genealogist needs this." | Complex UX (per-field sources, source manager, citation formats). Signals "I am a genealogy database." | Free-text `notes` field is sufficient for v1 target user. Revisit if users explicitly ask. |
| **Densely packed information hierarchy** (dozens of fields: occupation, religion, military rank, cause of death) | "Ancestry has all these." | Adds every one makes the side panel scroll-heavy and intimidating. Signals "database." | Keep side panel small: identity, life (4 fields), relationships, notes. Resist every request to add another field. |
| **Ethnicity / heritage pie charts** | Ancestry popularized this. | Requires DNA or inferred ethnicity models. Out of scope. | Hard no. |
| **Newspaper / document OCR** | Ancestry / MyHeritage feature. | Massive infra; not our category. | Hard no. |
| **Timeline view of a person's life** | Heredis 2026 and MacFamilyTree have this. | Canvas is the view. Adding alternative views dilutes positioning. | Hard no for v1. Weak v2 candidate only if users strongly request. |
| **Map view of ancestor places** | Heredis, MacFamilyTree have this. | Requires geocoding, map tile service, places schema. Nice but off-category. | Weak v2 candidate. Ship only after core is loved. |
| **Charts & reports** (fan chart, pedigree chart, kinship chart, genogram) | Genealogy databases have 10+ chart types. | Multiple view modes dilute the canvas identity. | The canvas *is* the chart. No alternative chart views. |
| **Kinship calculator** ("third cousin twice removed") | Geni has it. | Fun but niche. Not core to the canvas experience. | v2 at earliest. |
| **Public / SEO-indexed trees** | "So relatives can find us on Google." | Privacy nightmare (living persons); legal exposure; abuse vector. | Stay with Share-modal link-sharing toggle. Explicitly rejected in PROJECT.md — keep rejected. |
| **Mobile-first polish** | "My grandma will open it on iPhone." | Desktop-first is the wedge. Building two interaction models halves progress. | Read-only responsive view in v1.x; polished mobile editing in v2. |
| **CRDT-based conflict resolution** | "Figma does CRDT." | Wildly overkill for family-tree concurrency (~2 editors, ~rare overlap). | Last-write-wins per field (already decided in PROJECT.md). |
| **Full-canvas accessibility (screen-reader nav, arrow-key traversal)** | WCAG compliance. | Correct, but prohibitively expensive for v1. | Basic a11y (focus rings, ARIA labels, Enter/Esc) in v1. Full canvas a11y in v2. Already in PROJECT.md Out of Scope. |
| **Templates / starter trees** | FigJam/Miro have templates. | Family trees are personal by nature; a "template" is confusing. Onboarding with "who are you + your parents" is cleaner. | Replace with a guided empty-state: "Add yourself. Now add a parent." |

## Feature Dependencies

```
Auth (Clerk)
   └─required by─> Tree creation
                       └─required by─> Persistence (Postgres + RLS)
                                            └─required by─> Share modal
                                                                 └─required by─> Live presence

Canvas render + pan/zoom
   └─required by─> Node render
                       └─required by─> Selection
                                            └─required by─> Side panel
                                            └─required by─> Radial add menu
                                                                 └─required by─> Add relative mutations
                                                                                     └─required by─> Undo/redo
                                                                                     └─required by─> Tidy layout (dagre)

Edges (derived via computeEdges)
   └─requires─> Relationships stored on Person

Live presence (Realtime)
   └─requires─> Persistence + Share
   └─enhances─> All structural mutations (broadcast)

Search / ⌘K (v1.x candidate)
   └─requires─> Canvas transform controller (to recenter on result)

Photo on person (v1.x candidate)
   └─requires─> Object storage (Supabase Storage — already in stack)
   └─enhances─> Node rendering + side panel

Comments (v1.x candidate)
   └─requires─> Persistence + Share + presence
   └─conflicts─with─> Keeping side panel minimal (need a separate comment thread UI)

GEDCOM import (deferred / maybe v2)
   └─requires─> Parser + merge-into-existing-tree flow (itself requires duplicate detection)
   └─conflicts─with─> "Canvas-first, not genealogy database" positioning

Sheets sync (v2)
   └─requires─> Google OAuth scope + bidirectional sync engine + conflict resolution
```

### Dependency Notes

- **Share modal requires RLS-backed persistence.** Sharing without row-level security is a data leak. The schema and RLS policies must be right before Share ships.
- **Live presence requires persistence.** You can't broadcast changes that aren't saved.
- **Add-relative requires Undo.** Users *will* mis-click the radial menu; undo is the escape hatch. Ship them together.
- **Tidy layout requires a real layout lib (dagre).** The hand-rolled Reingold–Tilford in the prototype is already known broken (PROJECT.md §Context). Tidy should not ship with the prototype's layoutTree.
- **Search enhances everything once trees get big.** Not a v1 blocker, but becomes critical past ~20 nodes. Schedule for v1.x.
- **Comments conflict with "minimal side panel" ethos.** If added, use FigJam-style *pinned* comments on the canvas, not an additional side-panel section. This preserves the "canvas is the truth" model.
- **GEDCOM conflicts with product positioning.** If a user arrives asking for GEDCOM, they are in the wrong category. Avoid building features that attract the wrong user.

## Canvas-Tool Feature Comparison (Figma / FigJam / Miro / Whimsical lens)

The handoff's north star is "a focused canvas tool." This table checks whether we've
picked up the features canvas users expect.

| Canvas-tool feature | Figma | FigJam | Miro | Whimsical | Handoff? | Our call |
|---------------------|-------|--------|------|-----------|----------|----------|
| Infinite pan / zoom | ✅ | ✅ | ✅ | ✅ | ✅ v1 | table stakes ✅ |
| Cursor presence (multiplayer cursors) | ✅ | ✅ | ✅ | ✅ | Partial (avatar stack but no live cursors specified) | **Add live cursors to v1** — Supabase Realtime supports it; avatar stack alone under-delivers. |
| Comments pinned to canvas | ✅ | ✅ | ✅ | ✅ | ❌ | v1.x |
| Reactions / emoji stamps | ❌ | ✅ | ✅ | ❌ | ❌ | v2 (category fit is moderate — family trees aren't workshops) |
| Voting / dot-vote | ❌ | ✅ | ✅ | ❌ | ❌ | anti-feature (wrong category) |
| Minimap | Limited | ❌ | ✅ | ❌ | ❌ | v1.x candidate — useful past 30 nodes |
| Search / ⌘F | ✅ | ✅ | ✅ | ✅ | ❌ | **v1 recommended** (strongest gap) |
| Right-click context menu | ✅ | ✅ | ✅ | ✅ | ❌ | v1.x |
| Frames / sections | ✅ | ✅ | ✅ | ❌ | N/A | anti-feature (doesn't map to family trees) |
| Templates library | ❌ | ✅ | ✅ | ✅ | ❌ | anti-feature (family trees are personal) |
| Version history | ✅ | ✅ | ✅ | ✅ | ❌ | v2 |
| Export (PNG / PDF / share link) | ✅ | ✅ | ✅ | ✅ | Share link only | Add PNG/PDF export in v1.x |
| Follow-me / presenter mode | ✅ | ✅ | ✅ | ❌ | ❌ | v2 (family trees rarely need facilitated sessions) |
| Keyboard shortcuts | ✅ extensive | ✅ | ✅ | ✅ | ✅ basic (Enter/Esc/⌘Z) | Expand in v1.x (Tab between nodes, arrow-keys) |
| Auto-save indicator | ✅ | ✅ | ✅ | ✅ | ✅ | table stakes ✅ |

**Headline gap:** No in-tree search. For a canvas product, this is the most glaring
table-stakes miss in the handoff — recommend adding to v1.

## MVP Definition

### Launch With (v1) — Handoff Scope + Critical Additions

Directly from PROJECT.md's Active list, with annotations. Recommended additions flagged.

- [x] Auth (Google / Apple / email via Clerk) — per handoff
- [x] Tree creation, private by default — per handoff
- [x] Pan/zoom canvas with dot grid — per handoff
- [x] PersonNode rendering (180×76) — per handoff
- [x] Spouse + parent-child edges (derived SVG) — per handoff
- [x] Selection + double-click/Enter to open panel — per handoff
- [x] Side panel (identity, life, read-only relationships, actions) — per handoff
- [x] Radial add menu — *the* differentiator
- [x] Collision-nudge on add — per handoff
- [x] Undo/redo — per handoff
- [x] Bottom toolbar — per handoff
- [x] Toast messages — per handoff
- [x] Tidy layout (dagre, couples-as-merged-nodes) — per handoff
- [x] Share modal (Editor/Viewer, link-sharing toggle) — per handoff
- [x] Live presence + real-time edit broadcast — per handoff
- [x] Supabase persistence with RLS — per handoff
- [x] Pixel-parity with design tokens — per handoff
- [x] Vercel deploy — per handoff
- [ ] **🆕 Recommended addition: ⌘K / ⌘F search to jump to a person** — canvas-tool table stake, currently missing
- [ ] **🆕 Recommended addition: live cursors (not just avatar stack)** — the handoff's "avatar stack" under-delivers on multiplayer; Supabase Realtime makes cursors cheap
- [ ] **🆕 Recommended addition: delete-person confirmation UX** — handoff says "Remove" but doesn't specify confirm; prevent accidental tree damage on shared trees
- [ ] **🆕 Recommended addition: error/disconnect banner** — "Reconnecting…" when Realtime drops; "Couldn't save" on mutation failure
- [ ] **🆕 Recommended addition: basic a11y (focus rings, ARIA labels)** — not full canvas keyboard nav, but the absolute minimum

### Add After Validation (v1.x)

Ship these once v1 ships and you have usage data.

- [ ] Photo upload per person — high user value, medium cost, Supabase Storage already in stack
- [ ] Right-click context menu on nodes — faster add/remove/center workflow
- [ ] Duplicate person within tree — low cost, common ask
- [ ] PNG / PDF export of the tree — "I want to print this for Thanksgiving"
- [ ] Minimap for large trees — once users report losing their place
- [ ] Comments pinned to persons (FigJam-style) — if users ask for collaborative discussion
- [ ] Read-only responsive mobile view — "I want to show Mom on my phone"
- [ ] Expanded keyboard shortcuts (Tab between siblings, arrow-keys between generations) — moves toward the deferred full-a11y story

### Future Consideration (v2+)

Defer until product-market fit is proven.

- [ ] Google Sheets two-way sync — handoff step 9, deferred in PROJECT.md
- [ ] Version history / named snapshots — critical once multi-editor trees get real
- [ ] Activity feed / edit log — nice engagement, medium cost
- [ ] Full canvas accessibility (screen-reader, arrow traversal) — WCAG story
- [ ] Polished mobile editing — different product, different day
- [ ] Within-tree duplicate-person hint — lightweight ML / heuristic, purely within a single tree
- [ ] GEDCOM **export** (not import) — lock-in avoidance gesture
- [ ] Map / timeline alternate views — only if users explicitly request

### Explicitly Not Doing (Ever, Unless Category Shifts)

- Historical-records integration
- DNA integration / ethnicity
- Shared "one-world" tree (Geni / FamilySearch model)
- GEDCOM import
- Detailed source citations system
- Public SEO-indexed trees
- Pedigree / fan / kinship chart alternate views
- Newspaper / document OCR
- Templates library

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Radial add menu | HIGH | MEDIUM | P1 |
| Canvas pan/zoom + node render | HIGH | MEDIUM | P1 |
| Side panel edit | HIGH | LOW | P1 |
| Undo/redo | HIGH | MEDIUM | P1 |
| Tidy layout (dagre) | HIGH | HIGH | P1 |
| Share modal + RLS | HIGH | MEDIUM | P1 |
| Live presence + cursors | HIGH | MEDIUM | P1 |
| Auto-save indicator | MEDIUM | LOW | P1 |
| ⌘K search (added) | HIGH | LOW-MEDIUM | P1 |
| Delete confirm (added) | MEDIUM | LOW | P1 |
| Error/disconnect banner (added) | MEDIUM | LOW | P1 |
| Basic a11y (added) | MEDIUM | LOW | P1 |
| Photo upload per person | HIGH | MEDIUM | P2 |
| Right-click context menu | MEDIUM | LOW | P2 |
| Minimap | MEDIUM | MEDIUM | P2 |
| PNG/PDF export | MEDIUM | MEDIUM | P2 |
| Pinned comments | MEDIUM | MEDIUM | P2 |
| Read-only mobile view | HIGH | MEDIUM | P2 |
| Duplicate person | LOW | LOW | P2 |
| Sheets sync | MEDIUM | HIGH | P3 |
| Version history | MEDIUM | MEDIUM | P3 |
| Activity feed | LOW | MEDIUM | P3 |
| Full canvas a11y | MEDIUM | HIGH | P3 |
| GEDCOM export | LOW | MEDIUM | P3 |
| Within-tree duplicate hint | LOW | MEDIUM | P3 |
| DNA / records / ethnicity | — | — | ❌ anti |
| Shared-world tree | — | — | ❌ anti |
| GEDCOM import | — | — | ❌ anti |
| Source citations system | — | — | ❌ anti |
| Fan/pedigree chart views | — | — | ❌ anti |

**Priority key:**
- P1: Ship in v1 (must-have at launch)
- P2: v1.x (add after launch validates the core loop)
- P3: v2+ (defer until PMF is real)
- ❌ anti: deliberately not building

## Competitor Feature Analysis

### Genealogy-category competitors (what we deliberately skip)

| Feature | Ancestry | MyHeritage | FamilySearch | Geni | Our Approach |
|---------|----------|------------|--------------|------|--------------|
| DNA integration | ✅ core | ✅ core | ❌ | Partial | ❌ anti-feature |
| Historical records corpus | ✅ core (13B names) | ✅ core (32B records) | ✅ core (14.7B) | Limited | ❌ anti-feature |
| Smart Matches / record hints | ✅ | ✅ core | ✅ | ✅ | ❌ anti-feature |
| GEDCOM import/export | ✅ | ✅ | ✅ | ✅ | ❌ v1 (maybe export in v2) |
| Source citations | ✅ | ✅ | ✅ | ✅ | ❌ free-text notes only |
| Shared-world tree | ❌ private | ❌ private | ✅ single-tree | ✅ single-tree | ❌ private-then-shared only |
| Duplicate detection | ❌ | ❌ | ✅ | ✅ | v2 within-tree only |
| Real-time multiplayer editing | ❌ | ❌ | ⚠️ (async-ish) | ⚠️ | ✅ **core differentiator** |
| Canvas / spatial tree editor | ❌ (form-based) | ❌ | ❌ | ❌ | ✅ **core differentiator** |
| Radial add | ❌ | ❌ | ❌ | ❌ | ✅ **core differentiator** |
| Inline sharing with roles | Clunky | Clunky | N/A | ✅ | ✅ (clean Figma-style) |
| Modern visual design | ❌ dated | ❌ dated | ⚠️ | ⚠️ | ✅ (pixel-parity with handoff) |

### Canvas-category reference (what we match or deliberately omit)

| Feature | Figma | FigJam | Miro | Whimsical | Our Approach |
|---------|-------|--------|------|-----------|--------------|
| Pan/zoom infinite canvas | ✅ | ✅ | ✅ | ✅ | ✅ v1 |
| Multiplayer cursors | ✅ | ✅ | ✅ | ✅ | ✅ v1 (recommended addition) |
| Presence avatars | ✅ | ✅ | ✅ | ✅ | ✅ v1 |
| Comments pinned | ✅ | ✅ | ✅ | ✅ | v1.x |
| Stamps/reactions | ❌ | ✅ | ✅ | ❌ | v2 (low fit) |
| Voting | ❌ | ✅ | ✅ | ❌ | ❌ anti |
| Templates | ❌ | ✅ | ✅ | ✅ | ❌ anti (personal-data domain) |
| Minimap | Limited | ❌ | ✅ | ❌ | v1.x |
| Search (⌘F/⌘K) | ✅ | ✅ | ✅ | ✅ | ✅ v1 (recommended addition) |
| Right-click menu | ✅ | ✅ | ✅ | ✅ | v1.x |
| Version history | ✅ | ✅ | ✅ | ✅ | v2 |
| Export (PNG/PDF) | ✅ | ✅ | ✅ | ✅ | v1.x |
| Keyboard shortcuts | ✅ extensive | ✅ | ✅ | ✅ | ✅ basic v1, expand v1.x |
| Auto-save | ✅ | ✅ | ✅ | ✅ | ✅ v1 |

## Sources

### Genealogy category
- [Family Tree Magazine: Genealogy Websites Comparison](https://familytreemagazine.com/websites/genealogy-website-comparison/)
- [Genealogy Explained: Ancestry vs FamilySearch vs MyHeritage vs FindMyPast](https://www.genealogyexplained.com/ancestry-vs-familysearch-vs-myheritage-vs-findmypast/)
- [Geni.com review](https://genealogytools.com/should-you-contribute-to-geni-com-a-review/)
- [MyHeritage Smart Matching™ help](https://www.myheritage.com/help/en/articles/12852418-what-is-myheritage-smart-matching-and-how-do-i-use-it)
- [MyHeritage Cousin Finder blog post](https://blog.myheritage.com/2025/03/introducing-cousin-finder-gain-dna-level-insights-without-a-dna-test/)
- [FamilySearch: GEDCOM upload](https://www.familysearch.org/en/help/helpcenter/article/the-new-gedcom-upload-experience)
- [MyHeritage Knowledge Base: What is a GEDCOM File](https://education.myheritage.com/article/what-is-a-gedcom-file-and-how-does-it-help-in-genealogy/)
- [FamilySearch: Merge Duplicates](https://www.familysearch.org/en/help/helpcenter/article/how-do-i-merge-duplicates-in-family-tree-by-id)
- [FamilySearch 2025 merge update](https://www.familysearch.org/en/blog/family-tree-merge-2025-update)
- [FamilySearch: Privacy for living persons](https://www.familysearch.org/en/help/helpcenter/article/what-is-a-private-space-in-family-tree)
- [Ancestry Privacy Statement](https://www.ancestry.com/c/legal/privacystatement)
- [Ancestry: Family Tree Privacy](https://support.ancestry.com/s/article/Family-Tree-Privacy?language=en_US)
- [Heredis 2026 features (via Who Do You Think You Are)](https://www.whodoyouthinkyouaremagazine.com/feature/family-history-software)
- [MacFamilyTree 11 visualization](https://www.syniumsoftware.com/macfamilytree/visualize)
- [My Family Tree — mapping features](https://chronoplexsoftware.com/myfamilytree/)
- [Family Root App 2026 feature list](https://familyrootapp.com/blog/family-root-app-complete-feature-list-2026)
- [Best Genealogy Sites 2026 (Genome Link)](https://genomelink.io/blog/best-genealogy-sites)
- [Best Family Tree Software 2026 (Venngage)](https://venngage.com/blog/best-family-tree-software/)
- [Best Family Tree Builders 2026 (DNAweekly)](https://www.dnaweekly.com/blog/best-family-tree-builders/)
- [11 Best AI Tools for Genealogy 2026](https://www.incarn.co/en/blog/best-ai-tools-genealogy)
- [Legacy Tree: Using AI for Genealogy](https://www.legacytree.com/blog/using-ai-for-genealogy-research)
- [Data Protection Ombudsman: Genealogy FAQ (GDPR)](https://tietosuoja.fi/en/faq-genealogy)

### Canvas-tool category
- [FigJam team collaboration](https://www.figma.com/figjam/team-collaboration/)
- [Figma: Comments in FigJam](https://help.figma.com/hc/en-us/articles/1500004290941-Comments-in-FigJam)
- [Figma: Run voting sessions in FigJam](https://help.figma.com/hc/en-us/articles/9359912208663-Run-voting-sessions-in-FigJam)
- [Figma: Multiplayer Editing blog](https://www.figma.com/blog/multiplayer-editing-in-figma/)
- [Figma: Use products with keyboard](https://help.figma.com/hc/en-us/articles/360040328653-Use-Figma-products-with-a-keyboard)
- [Miro vs FigJam 2026 comparison](https://mockflow.com/blog/miro-vs-figjam)
- [FigJam vs Miro 2026 (Startup House)](https://startup-house.com/blog/figjam-vs-miro)
- [Miro Whiteboard Guide 2026 (TechTimes)](https://www.techtimes.com/articles/315554/20260330/miro-whiteboard-guide-infinite-canvas-sticky-notes-voting-team-collaboration.htm)
- [Miro infinite canvas](https://miro.com/online-canvas-for-design/)
- [Top Visual Collaboration Tools 2026 (Kuse)](https://www.kuse.ai/blog/workflows-productivity/visual-collaboration-tools)

### Canvas / performance engineering
- [React Flow: Performance](https://reactflow.dev/learn/advanced-use/performance)
- [Virtualizing the Canvas (Gedge)](https://gedge.ca/blog/2024-11-03-virtualizing-the-canvas/)
- [family-chart d3 library](https://github.com/donatso/family-chart)

---
*Feature research for: collaborative family tree web app (canvas-first)*
*Researched: 2026-04-21*
