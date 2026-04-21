# Pitfalls Research

**Domain:** Collaborative pan/zoom canvas app (family tree) — Next.js 14 App Router + TS + Tailwind + Clerk + Supabase (Postgres RLS + Realtime) + dagre
**Researched:** 2026-04-21
**Confidence:** HIGH (every major area backed by Supabase/Clerk/React-Flow official docs or recent community post-mortems; marked LOW where only WebSearch evidence exists)

---

## Critical Pitfalls

### Pitfall 1: Screen-space vs canvas-space coordinate confusion

**What goes wrong:**
Drag-to-move a node jumps by `zoom × delta` instead of `delta`. New radial-added nodes snap far from the anchor. Click hit-testing misses when zoomed in/out. On Retina, everything is off by `devicePixelRatio`.

**Why it happens:**
There are two coordinate spaces: **screen** (what `clientX/Y` reports) and **canvas** (what `Person.x/y` stores). When the app uses `translate(x,y) scale(k)`, a 10px mouse delta on screen equals `10/k` in canvas-space. Developers forget this when wiring drag handlers and mix the two spaces on the same vector.

**How to avoid:**
- Define one invariant: **all stored positions (`Person.x`, `Person.y`) are canvas-space; all pointer events are screen-space.**
- Write exactly one conversion helper (`screenToCanvas(px, py, transform)`) and its inverse. Route every coordinate through them.
- For drag deltas, always divide by `transform.k`.
- For zoom, anchor on the cursor using `offsetAfter = offsetBefore + (k_before − k_after) × canvasPoint` (see React-Flow's viewport math).
- Unit-test the round-trip `canvas → screen → canvas` at `k ∈ {0.25, 1, 4}`; error must be sub-pixel.

**Warning signs:**
- Nodes drift during drag when zoomed; "my cursor isn't on the node anymore."
- Radial menu appears off-center when zoomed out.
- Fit-to-view computes wrong bounds.

**Phase to address:** Phase 2 (Canvas + nodes, static) — lock the coordinate contract before anything dynamic is built.

---

### Pitfall 2: Wheel zoom that fights the browser (and macOS trackpad)

**What goes wrong:**
Two-finger scroll zooms the whole browser page instead of the canvas. Pinch-to-zoom on a MacBook trackpad zooms Chrome, not the tree. Console fills with "Unable to preventDefault inside passive event listener."

**Why it happens:**
Modern browsers default `wheel`, `touchstart`, `touchmove` to `{passive: true}` on document-level targets — `preventDefault()` is silently ignored. macOS trackpad pinch is delivered as a `wheel` event with `ctrlKey=true`; without explicit handling you get both your zoom *and* the browser's page zoom.

**How to avoid:**
- Register the wheel listener with `{passive: false}` on the canvas element (not window).
- Differentiate: `if (e.ctrlKey || e.metaKey) { /* zoom */ } else { /* pan */ }` — this is the cross-platform convention (macOS pinch → ctrlKey synthetic).
- Call `e.preventDefault()` in both branches on the canvas element only (never globally — you'll break page scroll everywhere else).
- Use React's native ref with `addEventListener` rather than `onWheel` prop; React 17+ attaches passive by default for wheel, so you cannot preventDefault through the synthetic event.

**Warning signs:**
- On Safari/Chrome with trackpad, pinch zooms the browser chrome.
- Console warning about passive listeners.
- Works on mouse but not trackpad (or vice versa).

**Phase to address:** Phase 2 (Canvas + nodes, static) — part of the pan/zoom foundation.

---

### Pitfall 3: Drag-while-zooming / drag-across-pan state corruption

**What goes wrong:**
User starts dragging a node, then pinches to zoom mid-drag. Node teleports. Or user presses spacebar to pan mid-drag; on release the node snaps to a wrong position.

**Why it happens:**
Drag handlers capture `mousedown.clientX/Y` and the starting `transform`, then subtract on `mousemove`. When `transform` changes mid-gesture (zoom or pan), the stored "start transform" is stale and deltas are computed against the wrong basis.

**How to avoid:**
- Use `setPointerCapture()` on `pointerdown` and compute the node's new position from **current transform at move time**, not start-of-gesture.
- Disable canvas zoom/pan input while a node drag is active (mutex: `isDraggingNode` blocks wheel/pan handlers).
- Use a pointer-event state machine with exactly one active mode: `IDLE | DRAG_NODE | PAN | ZOOM`.

**Warning signs:**
- Jank/teleport when mouse leaves the viewport during drag.
- Tests pass locally, fail in Playwright CI (faster event synthesis exposes races).

**Phase to address:** Phase 2–3 (Canvas interactions, selection).

---

### Pitfall 4: SVG edges re-render on every transform change

**What goes wrong:**
At 100+ nodes and therefore 200+ edges, panning the canvas becomes laggy. Zoom drops to 20fps. Every small state change causes the entire SVG `<path>` array to re-render.

**Why it happens:**
`computeEdges(people)` is called in `render()` every tick, and if its reference changes each render, memoized `PathEdge` components still invalidate. Worse: animating with `stroke-dasharray` on hundreds of paths pegs a CPU core — it's a known React Flow bottleneck.

**How to avoid:**
- Render edges in **one** `<svg>` overlay, not one `<svg>` per edge (fewer DOM nodes, single reflow).
- Memoize `computeEdges(people)` with `useMemo`, keyed only on the relationship arrays (not x/y).
- Split edges into **topology edges** (who connects to whom — invalidated only on structural changes) and **geometry paths** (invalidated on x/y moves). Re-derive paths from cached topology.
- Never use `stroke-dasharray` animations for selection/hover states at scale; use CSS `stroke` color transitions instead.
- The canvas transform (`translate(x,y) scale(k)`) should be applied **once on the parent container**, never on individual edges — one composite layer, zero per-edge layout cost.
- Budget: 200 edges must stay at 60fps during pan/zoom on a 2020-era laptop.

**Warning signs:**
- Chrome Performance tab shows long "Recalculate Style" / "Layout" during pan.
- `pan → FPS drops below 50` with >50 nodes.
- React DevTools highlights all edge components re-rendering on every pan frame.

**Phase to address:** Phase 4 (Edges). Add a 200-node perf test as gate before Phase 5.

---

### Pitfall 5: Full-state undo snapshots balloon memory

**What goes wrong:**
After an hour of editing, tab uses 500MB+. Safari kills the tab. Browser devtools show `history: Person[][]` with 500 snapshots × 200 people × ~300 bytes each = 30MB of logically duplicated state — except strings aren't actually shared if you use `JSON.parse(JSON.stringify(...))` for "deep clones."

**Why it happens:**
The prototype `history: Person[][]` naively pushes a deep-cloned array on every commit. For simple changes (typing a name), it snapshots the entire tree. No structural sharing, no depth cap.

**How to avoid:**
- Use **Immer** (`produce`) with `enablePatches()`. Keep patches + inverse patches in history rather than full snapshots. Each commit is typically <1KB.
- Alternatively: structural sharing via `immutable.js` or Zustand's middleware — unchanged objects keep referential identity.
- Cap history at 100 commits; drop oldest.
- **Do not** store history on the server; it stays client-side (per PROJECT.md decision).
- Debounce typing-into-a-field into a single commit (one commit per field on blur or after 500ms idle), not one per keystroke.

**Warning signs:**
- Heap snapshots show linear growth proportional to edits.
- Undo after 100 typed characters in "notes" replays one letter at a time.

**Phase to address:** Phase 6 (Undo/redo + auto-save indicator) — design the history strategy here, don't retrofit.

---

### Pitfall 6: Supabase RLS recursion on shared-tree lookup

**What goes wrong:**
The RLS policy on `people` checks "is the current user a member of the tree?" by joining to `tree_members`. `tree_members` has its own RLS policy that references `people`. Postgres detects the cycle and throws at runtime — a 500 in production, not at migration time.

**Why it happens:**
Natural RLS design for shared resources (trees ↔ members ↔ people) creates cross-table policy references that form cycles. It compiles fine; it only blows up when a query actually hits both tables.

**How to avoid:**
- Break recursion with a `SECURITY DEFINER` function that bypasses RLS for the lookup:
  ```sql
  CREATE FUNCTION user_tree_ids(uid UUID) RETURNS SETOF UUID
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT tree_id FROM tree_members WHERE user_id = uid $$;
  ```
  Then use `tree_id IN (SELECT user_tree_ids(auth.uid()))` in every downstream policy.
- Keep the membership table's policies minimal (user can see their own rows only — no cross-table joins).
- Write a migration test that attempts every read/write path and fails CI on infinite recursion.
- Wrap `auth.uid()` calls in `(SELECT auth.uid())` — Supabase docs explicitly call this out for perf (runs once per query, not per row).

**Warning signs:**
- `ERROR: infinite recursion detected in policy for relation "..."` in Supabase logs.
- Queries that return `[]` in dev (RLS blocks everything) when you expected data.

**Phase to address:** Phase 1 (Data model + auth) — RLS must be designed, not patched. Re-audit after Phase 8 (Share modal).

---

### Pitfall 7: RLS with row-by-row subqueries collapses at scale

**What goes wrong:**
Listing 500 people in a shared tree takes 3+ seconds. `EXPLAIN ANALYZE` shows the policy subquery running 500 times — one per row.

**Why it happens:**
Naive policies like `USING (auth.uid() IN (SELECT user_id FROM tree_members WHERE tree_id = people.tree_id))` re-execute the subquery per row. With no index on `tree_members.user_id`, it's O(rows × members).

**How to avoid:**
- Indexes on every column referenced by RLS policies (`tree_members.user_id`, `tree_members.tree_id`, `people.tree_id`).
- Use `(SELECT auth.uid())` — wrapping in SELECT allows Postgres to cache via initPlan.
- Prefer `IN (SELECT ...)` / `= ANY(...)` over correlated subqueries.
- For the common "list all people in tree X" query, pre-filter with `WHERE tree_id = $1` in the client — RLS becomes a safety net, not the primary filter.
- Load-test with 1000 people + 5 collaborators before Phase 9.

**Warning signs:**
- p95 latency on `people.select` > 300ms at 200 rows.
- Supabase dashboard's Performance Advisor flags multiple permissive policies.

**Phase to address:** Phase 1 (schema) + Phase 9 (perf audit before launch).

---

### Pitfall 8: Supabase Realtime channel leaks on component remount

**What goes wrong:**
User navigates to tree → subscribes → navigates away → navigates back. Each mount adds a channel. After 10 minutes of navigation, the browser has 50 live WebSocket channels; the project hits the `TooManyChannels` quota and Realtime stops working for all users.

**Why it happens:**
React 18 StrictMode intentionally double-invokes effects in dev. Supabase's docs explicitly flag this: uncleaned subscriptions compound. In production, channels also leak when `useEffect` cleanup functions close over stale channel refs.

**How to avoid:**
- Every `supabase.channel(...)` must have a matching `supabase.removeChannel(channel)` in the `useEffect` cleanup — not `channel.unsubscribe()` alone; that leaves the channel registered.
- Use **one channel per tree per tab**, not one per person/component. Multiplex: `channel("tree:" + treeId)` handles presence + broadcast + postgres_changes.
- Name channels deterministically so duplicates are easy to spot in the Realtime Inspector.
- Enable Web Worker mode in the Supabase client so heartbeats survive background tabs.
- In dev, watch the Realtime Inspector: if channel count climbs monotonically as you navigate, you have a leak.

**Warning signs:**
- Supabase dashboard shows channel count trending up.
- `CHANNEL_ERROR` events in console.
- TooManyChannels error in production.

**Phase to address:** Phase 8 (Share + collaborators) — write the channel-lifecycle helper before wiring any feature to it.

---

### Pitfall 9: Reconnect storms from auth failures

**What goes wrong:**
User's session JWT expires. Client tries to reconnect, fails with 401, retries immediately, fails again — thousands of reconnect attempts per minute. Project gets rate-limited.

**Why it happens:**
Clerk JWTs are short-lived (~60s for the `__session` cookie). If the Realtime client's auth token is set once at mount and never refreshed, every reconnect after the 60s expiry fails. Default reconnect backoff is aggressive.

**How to avoid:**
- Refresh the Realtime client's access token on Clerk's `session.getToken()` schedule. Use `supabase.realtime.setAuth(token)` on every token refresh.
- Configure exponential backoff on `CHANNEL_ERROR` (supabase-js has `reconnectAfterMs` option).
- Include a heartbeatCallback that checks status and reconnects only when disconnected — do not reconnect in a tight loop on every error.
- Test with a forcibly-expired token in dev.

**Warning signs:**
- Supabase logs show bursts of 401s followed by connection drops.
- Browser Network tab shows WebSocket re-opens every few seconds.

**Phase to address:** Phase 8 (Realtime integration).

---

### Pitfall 10: Broadcast fan-out on every keystroke (N+1 over Realtime)

**What goes wrong:**
With live collaboration enabled, typing a 20-character name in the side panel generates 20 broadcasts, each touching Postgres. With 5 collaborators, that's 100 messages. At scale it blows past Realtime's 10 msg/sec/channel limit and messages get dropped.

**Why it happens:**
Naive implementation broadcasts every local edit. Cursor-position is even worse — a mouse move emits dozens of events per second.

**How to avoid:**
- Throttle cursor broadcasts to **100ms** (Supabase's documented sweet spot — 90% message reduction vs. unthrottled).
- Debounce field edits to 250–500ms idle; broadcast once per logical change.
- Batch multiple field updates into a single `broadcast` payload when possible (`{ personId, patch: {...} }`).
- Distinguish channels: **presence + cursors via `broadcast`** (ephemeral, fast), **persistent edits via `postgres_changes`** (durable but slower). Never use `postgres_changes` for cursor movement.
- Client-side throttling is built into supabase-js (default 10/sec); don't disable it.

**Warning signs:**
- Realtime usage climbing disproportionately to active-user count.
- "Dropped messages" warnings in logs.

**Phase to address:** Phase 8.

---

### Pitfall 11: Clerk `auth()` called without middleware

**What goes wrong:**
Server component calls `auth()` and gets `{ userId: null }` even for logged-in users. Or: throws "auth() was called but Clerk can't detect usage of clerkMiddleware()."

**Why it happens:**
`clerkMiddleware()` must wrap the matcher config in `middleware.ts` at the project root (or `src/middleware.ts`). Without it, Clerk can't inject the session context into server components. Common mistakes: wrong file location, missing matcher config, or importing `auth` in a root layout that runs before middleware.

**How to avoid:**
- Place `middleware.ts` at the project root (or `src/` if using src-directory).
- Use the official matcher:
  ```ts
  export const config = { matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'] }
  ```
- **Do not** call `auth()` / `currentUser()` in `app/layout.tsx` — it runs for 404s and error boundaries where middleware may not have matched. Move auth-dependent UI to child layouts.
- Update Next.js ≥ 14.2.25 to close **CVE-2025-29927** (x-middleware-subrequest bypass). Either way, never rely on middleware alone for authz — re-check on every data access.

**Warning signs:**
- `userId` is null in server components but cookie is present.
- Build-time warnings about dynamic server usage on pages that use `auth()`.

**Phase to address:** Phase 1 (auth setup).

---

### Pitfall 12: Passing Clerk `currentUser()` across the Server/Client boundary

**What goes wrong:**
Next.js throws "Only plain objects can be passed to Client Components from Server Components" when passing the full user object as a prop.

**Why it happens:**
`currentUser()` returns a class instance, not a plain object. Next.js serialization rules reject it.

**How to avoid:**
- On the server, pick the fields you actually need: `{ id, fullName, imageUrl, primaryEmailAddress }` and pass those.
- Never `JSON.parse(JSON.stringify(user))` as a cure-all — it hides the real issue and ships PII you don't need.
- Use `<ClerkProvider>` + client-side `useUser()` hook for interactive UIs; reserve `auth()`/`currentUser()` for read-only server rendering.

**Warning signs:**
- Runtime error in production only (dev sometimes lets it through).
- Client components receiving `undefined` for methods that existed on the server user object.

**Phase to address:** Phase 3 (Side panel — first place user data is displayed in a client component).

---

### Pitfall 13: Auto-save "Saved" pill lies about save state

**What goes wrong:**
User types, pill flashes green "Saved." Network was down. Request failed silently. Data is lost on refresh. Trust is destroyed.

**Why it happens:**
The design hooks the pill to **local optimistic state commit**, not to server ACK. The debounced save fires, optimistic UI flips to "Saved" before the `fetch` resolves — or the fetch resolves to a 4xx/5xx that's not handled.

**How to avoid:**
- State machine for the pill: `idle → dirty → saving → saved | error`. Never jump `dirty → saved` without a server ACK.
- The pill's green state is only set on HTTP 2xx from the server, never on optimistic commit.
- On failure: pill turns red/warn, toast shows "Couldn't save — retrying." Auto-retry with exponential backoff.
- Detect offline (`navigator.onLine` + `online`/`offline` events) and show a distinct "Offline — changes saved locally" state.
- Persist a local "dirty" flag in `localStorage` keyed by `(treeId, personId, fieldName)` so reloads recover unsaved edits.

**Warning signs:**
- Pill goes green while DevTools Network shows a pending/failed request.
- No error state in the design — the pill only has two states ("Auto-saves" and "Saved").

**Phase to address:** Phase 6 (Auto-save indicator). This is the single most user-trust-critical pitfall.

---

### Pitfall 14: Last-write-wins losing concurrent field edits silently

**What goes wrong:**
Alice edits `notes` in the side panel, hasn't saved yet (debounced). Bob edits `birthYear` on the same person and his save fires first. Alice's save then overwrites Bob's `birthYear` with her stale value because she's PUTting the full record.

**Why it happens:**
"Last-write-wins" was scoped "per field" in the key decisions, but naive implementations PUT the whole person object — fields Alice didn't even look at get overwritten with her stale snapshot.

**How to avoid:**
- **Patch, don't put.** Update only the fields the user actually changed: `UPDATE people SET birth_year = $1 WHERE id = $2`. Never send the whole record.
- Track dirty fields per form (`Set<fieldName>`); send only dirty ones.
- For structural changes (add relationship), use explicit operations (`addChild`, `setSpouse`), not full-state replace.
- Version row with `updated_at`: if server `updated_at` > local `loaded_at`, reload and re-apply local patch on top (merge per field).
- Surface the merge: if Bob's change lands while Alice's panel is open, show a quiet "updated by Bob" indicator rather than silently overwriting the visible value.

**Warning signs:**
- QA script: two tabs, edit different fields of same person, refresh → one edit vanished.
- User complaints of "ghost edits."

**Phase to address:** Phase 6 (auto-save) + Phase 8 (realtime reconciliation).

---

### Pitfall 15: Auto-save request reordering clobbers latest value

**What goes wrong:**
User types "Olivia," waits, backspaces to "Oliv," waits. Two saves fire. Due to network jitter, the "Olivia" save arrives after the "Oliv" save. Server ends with "Olivia." User sees "Oliv" on their screen but reload shows "Olivia."

**Why it happens:**
Parallel in-flight saves have no ordering guarantee. HTTP doesn't serialize. Older save lands last.

**How to avoid:**
- **Serial save queue per resource:** only one in-flight save per `(treeId, personId)`; queue the next; coalesce duplicates.
- Tag each save with a monotonic `requestId`; server stores `last_applied_request_id`; server ignores out-of-order requests for the same field.
- OR: Use `AbortController` to cancel in-flight saves when a newer one starts for the same field.
- TanStack Query has a known race pattern (`cancelQueries` doesn't fully solve it); roll the queue explicitly.

**Warning signs:**
- Refresh reveals different data than what's on screen.
- Playwright test that rapidly edits a field produces flaky outcomes.

**Phase to address:** Phase 6.

---

### Pitfall 16: dagre treats couples as "merged node" off-by-one

**What goes wrong:**
Tidy button runs dagre. Couples appear as side-by-side nodes — but slightly offset, or one spouse's children appear under only one parent, or the children are duplicated under each parent. Adopted child with two biological + one adoptive parent gets placed awkwardly.

**Why it happens:**
dagre is a DAG layout — it doesn't model marriage. The recommended pattern is to introduce a **synthetic "couple" node** with no visual representation, route children as edges from the couple-node, and place spouses by post-processing. Off-by-one errors come from:
1. Forgetting to hide the couple-node visually but keeping it as a layout anchor.
2. Not accounting for the couple-node's `width = 2×NODE_W + couple_gap` when dagre computes ranks.
3. Singletons (never-married) skipped entirely if they only appear as children with no couple.

**How to avoid:**
- Build the dagre graph in two passes: (1) add a synthetic `couple:{id1,id2}` node for every spouse pair; (2) add child edges from `couple:...` → child, parent edges from each spouse → `couple:...`.
- Set `ranksep` (generation gap) to match `NODE_H + 120`; set `nodesep` per node-type (couple nodes wider than singles).
- Post-process: split the couple-node's computed x/y back into two positions at `(x − NODE_W/2 − gap/2, y)` and `(x + NODE_W/2 + gap/2, y)`.
- Draw spouse edge separately as a horizontal line between the two positions (not via dagre's edge layout).
- Unit-test Tidy with: (a) singleton, (b) simple couple + children, (c) multiple marriages (Alice married Bob then Carol), (d) adoptive parents, (e) step-children.

**Warning signs:**
- Layout "works" on the seed family but breaks on the first real family entered.
- Tidy produces a different layout each run (non-determinism from unstable node ordering).

**Phase to address:** Phase 7 (Tidy layout with dagre).

---

### Pitfall 17: Tidy-induced layout thrash destroys user mental map

**What goes wrong:**
User has arranged nodes just how they want them. They click Tidy. Everything moves by 200+ pixels. They can't find their grandmother. Undo — but Tidy is stored as one undo step, so they lose the entire manual layout in one click.

**Why it happens:**
dagre layout has no awareness of the user's prior arrangement. Tidy is an "all or nothing" operation.

**How to avoid:**
- Tidy must commit to history as a single undo step with a confirm UX if major movement would occur (>X% of nodes moving >Y pixels).
- Offer "Tidy selected subtree" rather than always whole-tree.
- Add gentle animation (300ms) during Tidy so users see where nodes flew, preserving spatial memory.
- Toast: "Tidied. Cmd-Z to restore." with action affordance.
- Consider "lock position" per-person for anchors the user wants Tidy to respect.

**Warning signs:**
- User research: "I don't click Tidy because I can't find things after."

**Phase to address:** Phase 7.

---

### Pitfall 18: Cycles & self-parents in the family graph

**What goes wrong:**
A user accidentally sets Person A as Person B's child *and* B as A's child (self-reference loop in a poorly designed form). Or imports bad data where Alice is her own grandmother. Rendering recurses infinitely; layout never completes; server CPU hits 100%.

**Why it happens:**
Relationship arrays (`parentIds`, `childIds`) are free-form; no invariant enforcement. Even GEDCOM's spec warns about this — "a person is their own ancestor in most cases would be an error."

**How to avoid:**
- Server-side validation on every mutation:
  - `parentIds.length ≤ 2`
  - `self.id ∉ self.parentIds ∪ self.childIds ∪ self.spouseIds`
  - No ancestor cycle: on adding parent relationship A→B, walk B's ancestors; reject if A is among them.
  - No descendant cycle: symmetric.
- Database-level CHECK: `id != ANY(parent_ids)`.
- DFS cycle-detection utility used both in client (to disable invalid radial actions) and server (as last line of defense).
- Wrap relationship mutations in a `SECURITY DEFINER` function that validates atomically.
- For the `isMe` anchor: exactly zero-or-one person per tree has `isMe = true` (unique partial index).

**Warning signs:**
- Hung browser tab on render.
- Server timeout on load.

**Phase to address:** Phase 1 (data model) — bake this into the schema, not the UI.

---

### Pitfall 19: Step-relations & multiple marriages collapsed into biological relations

**What goes wrong:**
Data model has `parentIds: string[]` (max 2). Real family: Alice's biological parents Bob+Carol divorce; Bob marries Dana; Dana adopts Alice. Alice has four "parents." App can't represent this. User shoehorns it (deletes Carol) or gives up.

**Why it happens:**
GEDCOM distinguishes biological/adopted/step/guardianship lineage types; a simple `parentIds` array loses this. The design spec commits to `parentIds: 0-2` which is biologically inspired but socially wrong for many real families.

**How to avoid:**
- Add a `lineage_type` on the parent-child relationship: `biological | adopted | step | guardian | foster | unknown`.
- Promote parent-child to its own table (`relationships(parent_id, child_id, kind)`) rather than arrays on Person. Cleaner, supports >2 parents, indexes well for RLS.
- Supports multiple marriages: `spouse_relationships(person_a, person_b, start_year, end_year, kind: married|partnered|divorced)`.
- UI v1 can still show "Parents: X, Y" but the model isn't the limiter.
- **Decision point:** PROJECT.md says edges are derived from relationship arrays. This pitfall argues for a `relationships` table instead. Either way: validate the implications before Phase 1 schema freeze.

**Warning signs:**
- User forum requests: "how do I add a stepfather?"
- Workarounds in data: "Dana (step)" crammed into the name field.

**Phase to address:** Phase 1 (schema). Revisit in Phase 5 (add-relative) for UX surface.

---

### Pitfall 20: Collision-nudge on add produces degenerate layouts

**What goes wrong:**
Adding a child nudges it clear of siblings, but after 6 siblings, the 7th is nudged off-screen. Or: adding a parent above a selected node collides with a grandparent and the algorithm pushes the parent *through* the grandparent.

**Why it happens:**
"Simple collision-nudge" in the prototype only checks one axis and one collision round. Real trees need multi-pass resolution or it's better to call Tidy.

**How to avoid:**
- Limit nudge to N passes (e.g., 3); if still colliding, auto-call Tidy or ask user.
- When nudging, check all nodes within `NODE_W + 32` bounding box, not just same-row.
- After any collision-nudge that moves >1 other node, ensure result is committed to history as one atomic step (not N small ones).
- Or simpler: always route structural adds through dagre (partial local layout) rather than arithmetic nudging.

**Warning signs:**
- Nodes appearing at negative coordinates or off-screen.
- Users reporting "duplicate" nodes that are actually overlapping.

**Phase to address:** Phase 5 (Add-relative).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `JSON.parse(JSON.stringify(people))` for undo snapshots | Works immediately, zero deps | Memory blows up at ~200 edits; breaks on Date/undefined fields | Prototype only — swap to Immer patches before Phase 6 ships |
| Arrays (`parentIds`, `childIds`) on Person instead of `relationships` table | Matches prototype exactly; simpler reads | Can't express lineage type, ≥3 parents, marriage metadata | Only if v1 strictly biological; re-architect in v2 is costly (data migration, RLS rewrite) |
| PUTting whole Person on save | Fewer API endpoints | Last-write-wins clobbers concurrent fields | **Never** — always patch dirty fields |
| Single RLS policy per table with JOINs | Feels clean | Cross-table recursion, O(rows×members) performance | Acceptable for non-shared tables (user's own preferences); never for `people` |
| `useEffect(() => { supabase.channel(...) }, [])` without cleanup | Works for 5 minutes | Channel leaks, TooManyChannels in production | Never — always cleanup |
| Zoom with `onWheel` React prop | Simple | Passive listener; can't preventDefault; page scrolls | Never — use ref + addEventListener with `{passive:false}` |
| Tidy button replaces all coordinates | Simple dagre integration | Destroys user's manual layout in one click | Acceptable in Phase 7 MVP; improve UX in v2 |
| Mock presence with fake avatars | Ships the topbar design | UI hooks you can't easily plug real presence into later | Acceptable pre-Phase 8 as a placeholder; must be torn out, not plastered over |
| One Realtime channel per component | Modular | Channel count explodes; hits quota | Never — one channel per tree, multiplexed |
| `auth()` in root `app/layout.tsx` | Session available everywhere | Breaks 404 / error boundary; forces full dynamic rendering | Never — move to child layouts |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Clerk ↔ Next.js App Router** | `auth()` in root layout; relying on middleware for authz | Middleware for redirect only; re-verify at every data access; keep auth calls in child layouts / pages |
| **Clerk ↔ Supabase** | Clerk JWT not refreshed on Supabase client after expiry | `supabase.realtime.setAuth(token)` on every Clerk `session.getToken()` refresh (~60s TTL) |
| **Supabase Realtime ↔ React 18 StrictMode** | Dev double-invoke doubles channels | Strict `removeChannel()` cleanup in every `useEffect` |
| **Supabase Postgres ↔ Clerk user IDs** | Using Clerk's `user.id` as FK but RLS policy expects `auth.uid()` | Set Supabase session with Clerk JWT (via `Authorization` header) so `auth.uid()` returns Clerk's user ID; or store Clerk user_id and match explicitly |
| **dagre ↔ React** | Running dagre on every render | Run only on Tidy-click; cache result; commit to history |
| **lucide-react ↔ Next.js tree-shaking** | Importing from `lucide-react/icons` misses tree-shake; large bundle | Import named exports from top-level `lucide-react` |
| **Tailwind ↔ design tokens** | Redefining colors inline instead of extending theme | Extend `tailwind.config.ts` with the `--bg`, `--ink-*`, `--accent` CSS vars |
| **Vercel Edge ↔ Clerk** | CVE-2025-29927 (x-middleware-subrequest bypass) | Pin Next ≥14.2.25 or block the header at the edge/proxy |
| **Supabase Storage (if used later for avatars)** | RLS not applied to Storage by default | Explicit Storage policies per bucket |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-edge `<svg>` element | Laggy pan at 100+ nodes | One `<svg>` overlay containing all `<path>`s | ~100 edges |
| Re-running `computeEdges` on every render | CPU pegs during typing | `useMemo` keyed on relationship arrays only | ~50 nodes |
| RLS policy with uncached `auth.uid()` | 300ms+ p95 on list queries | `(SELECT auth.uid())` + indexes | ~500 rows |
| Full-state undo snapshots | Tab OOM after long session | Immer patches + 100-commit cap | ~200 edits |
| Unthrottled cursor broadcasts | Realtime quota exhausted | 100ms throttle | 5+ collaborators |
| Per-keystroke auto-save | Burst writes; rate-limited by Postgres | 500ms debounce + patch only dirty fields | Immediately for typing in notes textarea |
| Rendering offscreen nodes | Slow pan on large trees | Viewport culling (only render nodes within viewport + 200px margin) | 500+ nodes |
| dagre layout on main thread | UI freezes during Tidy | Move to Web Worker for trees >100 nodes | 200+ nodes |
| Non-memoized node components | Every pan re-renders all nodes | `React.memo` with custom comparator on `x, y, selected, hovered` | 50+ nodes |
| `stroke-dasharray` for edge animation | CPU core pinned during hover states | Use `stroke` color transition, not dash animation | Any scale when hover effects are used |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Relying on middleware alone for authz (CVE-2025-29927) | Attacker bypasses auth with a header | Pin Next.js ≥14.2.25; re-verify auth on every data read/write; block `x-middleware-subrequest` at the proxy |
| `tree_members` table without RLS | Anyone can query who has access to any tree | RLS on every user-data table; `FORCE ROW LEVEL SECURITY` on ownership tables |
| RLS on `SELECT` only | Updates/inserts bypass checks | Policies for SELECT, INSERT, UPDATE, DELETE explicitly |
| Client trusting `tree_id` in request body | User A passes Tree B's ID, writes to someone else's tree | Always verify `tree_id` is accessible via RLS or server-side check |
| Invite tokens with no expiry | Forever-valid share links leak | TTL on invite tokens; signed, scoped (tree_id + email + role) |
| Public link-view without opt-in | Private family data indexed by search engines | `robots.txt` disallow; `noindex` meta; link-share toggle explicitly off by default; signed view tokens |
| Storing PII in toast/log messages | "Added parent Jane Doe" leaks names into error-reporting services | Scrub PII from analytics/error logs; treat person names as sensitive |
| Clerk session data in localStorage | XSS exfiltration | Clerk uses httpOnly cookies — don't duplicate session data in JS-accessible storage |
| Realtime channel subscriptions without tree-access check | User subscribes to `tree:xxx` for a tree they don't own, receives all edits | Enable Realtime Authorization (RLS on Realtime channels, Supabase 2024+ feature) |
| GDPR/data-deletion for removed collaborators | Former collaborator keeps cached data via replication | Broadcast a "membership revoked" event + server-side invalidation |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "Saved" pill shows green while save is in-flight | Lost work on refresh; broken trust | Only green on server ACK; distinct error + retry state |
| Tidy layout erases manual arrangement with no preview | User never clicks Tidy again | Preview diff; "undo Tidy" snackbar; animate transition |
| Radial menu closes on any click outside including on another node | User can't chain "add parent, then click grandparent to add their parent" | Clicking another node transfers selection + re-opens radial if user requested chain mode |
| Undo doesn't rewind selection/panel state | User undoes an edit but panel still shows old person | Selection + panel-open in the undo state, not just `people` |
| New node auto-opens side panel AND auto-focuses name AND tree is jumping around | Disorienting after 2 clicks | Smooth-scroll to new node; focus name field; don't animate panel open during scroll |
| No indication when another collaborator is editing the same field | Last-write-wins silently drops changes | Soft lock/indicator: "Bob is editing this" via presence on the field |
| Offline edits appear saved but aren't synced | User closes tab, loses work | Service worker + local persistence queue + "offline changes will sync" banner |
| Error toasts auto-dismiss in 2.2s | User never sees the error | Error toasts are sticky with dismiss button; only success/info auto-dismiss |
| Empty-tree state same as error state | User thinks app is broken on first load | Distinct empty-state with CTA: "Add yourself to get started" |
| ⌘Z in an input field undoes app state instead of text | User types "mistake", Cmd-Z, loses not just the text but the entire last structural change | Scope shortcuts: Cmd-Z in text input uses browser default; only fires app undo when no input is focused |

---

## "Looks Done But Isn't" Checklist

- [ ] **Pan/zoom:** Works with mouse? Also test trackpad two-finger scroll, trackpad pinch, macOS Magic Mouse, Windows touchpad, and touch (tablet). Each has different event semantics.
- [ ] **Auto-save pill:** Turns green — but did the server actually ACK? Test with Chrome DevTools offline throttling.
- [ ] **Undo/redo:** Works for add/remove. But does it restore selection? Side-panel state? Scroll position? Does it handle 100+ history entries without memory creep?
- [ ] **RLS:** Policy tests pass for owner. Do they pass for Editor? Viewer? Someone removed from the tree? Someone invited but not yet accepted?
- [ ] **Realtime:** Cursor shows for collaborator. What happens when collaborator closes tab — does ghost cursor persist? What about browser crashes?
- [ ] **Clerk auth:** Sign-in flow works. Does session refresh at 60s? What happens on token expiry during active edit?
- [ ] **Edges:** SVG paths drawn. Do they update when nodes move? When nodes are deleted (no orphan edges)? When relationship is severed? When both endpoints move simultaneously?
- [ ] **Tidy:** Produces clean layout for the seed family. Try: multiple marriages, adopted children, half-siblings, cousins, a widow who remarried.
- [ ] **Share modal:** Invite by email works. What if the email isn't a Clerk user yet — is there a pending-invite flow? Does unaccepted invite block RLS?
- [ ] **Drag:** Node repositions. Now try dragging while panning with space-bar. Now try dragging while someone else is editing that same person.
- [ ] **Radial menu:** Opens on + click. Does Esc close it? Does clicking outside close it? On touch devices, does it work at all?
- [ ] **Toasts:** Appear. Do they stack sensibly? Does a new one cancel the old? Are errors sticky?
- [ ] **Deployment:** Works on Vercel preview. Does it work on mobile Safari? Firefox? Safari tech preview? How does it degrade without JS?
- [ ] **Data integrity:** Can a user create a cycle (self-parent)? Set themselves as their own spouse? Delete their `isMe` person without warning?
- [ ] **Accessibility:** Keyboard Enter opens panel. Does the canvas announce node focus? Do buttons have aria-labels? Does radial menu work with arrow keys?

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Coordinate-space bug | MEDIUM | Add logging + visualization overlay showing canvas vs screen coords; fix one handler at a time; regression test at 3 zoom levels |
| RLS recursion in production | HIGH | Hotfix SECURITY DEFINER function; audit every policy for cross-table refs; deploy via migration with downtime if needed |
| Channel leak causing TooManyChannels | MEDIUM | Force-refresh all clients (release new version); fix cleanup; add monitoring on channel count |
| Undo memory OOM | HIGH | Ship patch-based history; migrate existing sessions (invalidate history on deploy) |
| Last-write-wins lost Bob's edit | HIGH | Can't recover the lost data; mitigate by adding event-sourced audit log going forward; communicate to users |
| Save pill lied | HIGH (trust) | Add retry + error UX; consider "last successful save" timestamp in UI; apology + audit of recent edits |
| dagre couple-merge off-by-one | LOW | Most fixable by tweaking synthetic-node widths/ranksep; test with real-family fixtures |
| Cycle in relationship data | MEDIUM | Server-side cycle detection on every mutation; repair tool to find and break existing cycles |
| Clerk session middleware misconfigured | LOW | Move middleware.ts to correct location; redeploy; users re-authenticate |
| Realtime broadcast flooding | LOW | Add throttle; ship; channel counts normalize within minutes |

---

## Pitfall-to-Phase Mapping

Mapping to Suggested Implementation Order (from handoff README):

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RLS recursion (#6) | Phase 1 (Data model + auth) | Policy tests for every CRUD path; CI fails on recursion error |
| RLS performance (#7) | Phase 1 + Phase 9 (perf audit) | EXPLAIN ANALYZE p95 < 100ms at 500 rows |
| Cycles in graph (#18) | Phase 1 (schema) | Fuzz test: random mutations never produce cycles |
| Step-relations data model (#19) | Phase 1 (schema) | Fixture family with adoptions/remarriages renders correctly |
| Clerk middleware config (#11) | Phase 1 (auth) | Protected-route test; matcher covers all app paths |
| Clerk serialization boundary (#12) | Phase 3 (Side panel) | Lint rule or code review catches class-instance props |
| Coordinate-space confusion (#1) | Phase 2 (Canvas) | Unit tests for screen↔canvas round-trip |
| Wheel-event passivity (#2) | Phase 2 (Canvas) | Manual test matrix: mouse, trackpad, pinch on macOS/Windows |
| Drag-during-zoom races (#3) | Phase 2–3 | Playwright E2E with rapid zoom+drag |
| SVG edge perf (#4) | Phase 4 (Edges) | 200-node perf test at 60fps gate |
| Undo memory (#5) | Phase 6 (Undo/redo) | Heap snapshot after 500 edits < 50MB |
| Auto-save lying pill (#13) | Phase 6 (Auto-save) | Offline DevTools test; pill never green with pending request |
| LWW clobbering fields (#14) | Phase 6 + Phase 8 | Two-tab concurrent-edit test; no field silently overwritten |
| Save reordering (#15) | Phase 6 | Rapid-typing test; final server state matches final client state |
| dagre couple-merge (#16) | Phase 7 (Tidy) | Fixture families: singleton, couple, remarriage, adoption |
| Tidy destroying manual layout (#17) | Phase 7 | UX: preview + undo snackbar |
| Realtime channel leaks (#8) | Phase 8 (Share + live) | Navigation stress test; channel count stable |
| Reconnect storms (#9) | Phase 8 | Forced token expiry in dev; backoff observed |
| Realtime broadcast fan-out (#10) | Phase 8 | 5-tab collab test; msg rate < Realtime quota |
| Collision-nudge degeneracy (#20) | Phase 5 (Add-relative) | Add 10 children in a row without off-screen nodes |

---

## Sources

**Supabase RLS & Performance:**
- [Supabase Docs: RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase Docs: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Discussion #4509: Team members RLS pattern](https://github.com/orgs/supabase/discussions/4509)
- [Supabase RLS Best Practices — MakerKit](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Supabase RLS in Production — DEV Community](https://dev.to/whoffagents/supabase-row-level-security-in-production-patterns-that-actually-work-2l78)

**Supabase Realtime:**
- [Supabase Docs: Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Docs: TooManyChannels Error](https://supabase.com/docs/guides/troubleshooting/realtime-too-many-channels-error)
- [Supabase Docs: Realtime Silent Disconnections](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794)
- [Supabase Discussion #21995: Realtime best practices](https://github.com/orgs/supabase/discussions/21995)
- [Supabase Docs: Client-Side Throttling](https://docs-ajzc160j5-supabase.vercel.app/docs/guides/realtime/guides/client-side-throttling)
- [Reducing Supabase Realtime Costs by 73% — TechAI Blog](https://techsynth.tech/blog/reducing-supabase-realtime-costs-by-73-percent/)

**Clerk + Next.js:**
- [Clerk Docs: clerkMiddleware()](https://clerk.com/docs/reference/nextjs/clerk-middleware)
- [Clerk Docs: auth() was called but clerkMiddleware not detected](https://clerk.com/docs/reference/nextjs/errors/auth-was-called)
- [Clerk Docs: Reading Session Data in App Router](https://clerk.com/docs/nextjs/guides/users/reading)
- [WorkOS: Next.js App Router Authentication Guide 2026](https://workos.com/blog/nextjs-app-router-authentication-guide-2026)
- [LogRocket: Auth libraries for Next.js 2026](https://blog.logrocket.com/best-auth-library-nextjs-2026/) — covers CVE-2025-29927
- [Clerk Issue #2710: auth() in server actions build errors](https://github.com/clerk/javascript/issues/2710)

**Pan/Zoom & Canvas:**
- [React Flow: Panning and Zooming](https://reactflow.dev/learn/concepts/the-viewport)
- [Steve Ruiz: Creating a Zoom UI](https://www.steveruiz.me/posts/zoom-ui)
- [React Flow: Common Errors](https://reactflow.dev/learn/troubleshooting/common-errors)
- [tigerabrodi: Trackpad Pinch-to-Zoom vs Two-Finger Scroll](https://tigerabrodi.blog/how-to-handle-trackpad-pinch-to-zoom-vs-two-finger-scroll-in-javascript-canvas-apps)
- [MDN: Element wheel event](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event)

**SVG/Performance:**
- [React Flow: Performance](https://reactflow.dev/learn/advanced-use/performance)
- [Tuning Edge Animations in React Flow](https://liambx.com/blog/tuning-edge-animations-reactflow-optimal-performance)
- [CSS-Tricks: High Performance SVGs](https://css-tricks.com/high-performance-svgs/)
- [React Flow Discussion #4975: Performance with large node counts](https://github.com/xyflow/xyflow/discussions/4975)

**Undo/Redo:**
- [esveo: Undo, Redo, and the Command Pattern](https://www.esveo.com/en/blog/undo-redo-and-the-command-pattern/)
- [Command Pattern Undo/Redo in React — DEV](https://dev.to/mustafamilyas/creating-undo-redo-system-using-command-pattern-in-react-mmg)
- [Command-based Undo for JS — DEV](https://dev.to/npbee/command-based-undo-for-js-apps-34d6)

**dagre & Family Tree Layout:**
- [dagre Issue #130: Layout for a family tree](https://github.com/dagrejs/dagre/issues/130)
- [TVA: React Flow for Family Tree Visualization](https://www.tva.sg/insights/reactflow-family-tree-visualization)
- [React Flow: Dagre Tree Example](https://reactflow.dev/examples/layout/dagre)

**Family Tree Data Model:**
- [FamilySearch GEDCOM Specification 7.0](https://gedcom.io/specifications/FamilySearchGEDCOMv7.html)
- [FamilySearch: The Family Tree Data Model](https://developers.familysearch.org/main/docs/the-family-tree-data-model)
- [Genealogy Tools: The Perils of Following the GEDCOM Standard](https://genealogytools.com/the-perils-of-following-the-gedcom-standard/)

**Optimistic UI & Conflicts:**
- [OneUptime: Preventing Race Conditions with Optimistic Locking (Jan 2026)](https://oneuptime.com/blog/post/2026-01-25-prevent-race-conditions-optimistic-locking-go/view)
- [colum Kelly: useOptimistic Won't Save You](https://www.columkelly.com/blog/use-optimistic)
- [SWR PR #1970: Fix race conditions in optimistic UI](https://github.com/vercel/swr/pull/1970)
- [Patient: React Query Autosave & Race Conditions](https://www.pz.com.au/avoiding-race-conditions-and-data-loss-when-autosaving-in-react-query)
- [First Resonance: Optimistic updates with concurrency control](https://medium.com/first-resonance-engineering/optimistic-updates-with-concurrency-control-6f1b07b8e98d)

**Next.js CVE:**
- [CVE-2025-29927 — referenced in LogRocket 2026 auth guide](https://blog.logrocket.com/best-auth-library-nextjs-2026/)

---

*Pitfalls research for: collaborative pan/zoom family tree web app (Next 14 + Clerk + Supabase + dagre)*
*Researched: 2026-04-21*
