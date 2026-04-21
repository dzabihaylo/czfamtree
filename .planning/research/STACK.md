# Stack Research

**Domain:** Collaborative pan/zoom canvas app (family tree) with Clerk auth, Supabase persistence + Realtime, marriage-aware graph layout via dagre
**Researched:** 2026-04-21
**Confidence:** HIGH (versions verified against npm registry 2026-04-21; integration patterns verified against Context7 + official docs)

## TL;DR — Prescriptive Stack

- **Framework:** Next.js **16.2.4** (App Router) + React **19.2.5** + TypeScript **6.0.3** (PROJECT.md says "Next.js 14" — that is stale; Next 16 is current stable and required by `@clerk/nextjs` v7)
- **Auth:** Clerk **7.2.3** (`@clerk/nextjs`) using the new third-party-auth integration with Supabase (the old JWT-template pattern was deprecated 2025-04-01)
- **DB + Realtime:** Supabase Postgres with RLS; `@supabase/supabase-js` **2.104.0** + `@supabase/ssr` **0.10.2**
- **Styling:** Tailwind CSS **4.2.4** with CSS-first `@theme` tokens (handoff's `:root` CSS variables map 1:1)
- **Canvas pan/zoom:** **Custom CSS transform on a wrapper div** (no library). React Flow and react-zoom-pan-pinch both fight the handoff's "nodes are absolutely-positioned divs inside a single `translate(x,y) scale(k)` parent" model
- **Graph layout:** **`@dagrejs/dagre` 3.0.0** (NOT the unscoped `dagre` — that package is dead at 0.8.5)
- **State:** **Zustand 5.0.12** + **zundo 2.3.0** (temporal middleware for undo/redo) + **immer 11.1.4**
- **Forms:** **React Hook Form 7.73.1** + **Zod 4.3.6** + **@hookform/resolvers 5.2.2**
- **Icons:** **lucide-react 1.8.0**
- **Testing:** **Vitest 4.1.5** (unit) + **Playwright 1.59.1** (E2E)
- **Deploy:** Vercel (native Next.js 16 support, 1-click Supabase integration)

## IMPORTANT: Correction vs. PROJECT.md

`PROJECT.md` reads "Next.js 14 App Router". That is current-as-of-2024 guidance and should be updated to **Next.js 16** before roadmap writing:

- `@clerk/nextjs@7` (Core 3) requires Next 16 / React 19. Pinning to Next 14 forces Clerk 5 (Core 1), which is in legacy support.
- Next 16 deprecates `experimental.dynamicIO` → `cacheComponents: true`, which is relevant for the tree-data-fetching pattern (server component reads tree, client component renders canvas).
- Tailwind v4 + Next 16 is now the default starter; v3 is no longer recommended for new projects.

All decisions below assume Next 16 / React 19. If the team explicitly wants to freeze at Next 14, flag to the orchestrator — the Clerk and Supabase SSR patterns diverge meaningfully.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.4 | App Router framework, RSC, server actions | Vercel-native; RSC lets the initial tree load skip a client round-trip; Server Actions replace `/api` boilerplate for mutations; matches handoff's suggested stack (upgraded to current major) |
| React | 19.2.5 | UI runtime | Required by Next 16. Stable `use()`, `useOptimistic`, Actions pattern fit optimistic node edits perfectly |
| TypeScript | 6.0.3 | Type safety | Non-negotiable for a graph model with `Person.parentIds/spouseIds/childIds` invariants. TS 6 isolatedDeclarations lands cleanly |
| Tailwind CSS | 4.2.4 | Utility styling | v4's CSS-first `@theme` block maps the handoff's `--bg`, `--ink-*`, `--accent`, `--rule`, radius, and shadow tokens directly — no `tailwind.config.js` needed, design parity is trivial |
| Clerk (`@clerk/nextjs`) | 7.2.3 | Auth (Google, Apple, email) | Fastest path to the 3-button sign-in screen; built-in email magic links; native Supabase third-party-auth integration; `<ClerkProvider>` + `clerkMiddleware()` is <10 LOC of setup |
| Supabase JS | 2.104.0 | Postgres REST client + Realtime WebSocket | Accepts Clerk JWT via `accessToken: async () => (await auth()).getToken()`, RLS picks up `auth.jwt()->>'sub'` = Clerk user id |
| Supabase SSR | 0.10.2 | Cookie-aware SSR client factory | Required for App Router; `createServerClient` pattern handles cookie writes inside Server Actions |
| @dagrejs/dagre | 3.0.0 | Directed-graph layout | Marriage-aware layout by treating each couple as one merged node; ranksep/nodesep map to handoff's 120px generation gap and 40px sibling gap; actively maintained scoped fork |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5.0.12 | Client state (people, selection, transform, UI flags) | The whole canvas app state. One store, selectors in components, bypasses React context rerender cascades |
| zundo | 2.3.0 | Zustand temporal middleware | Wraps the store to give `undo()` / `redo()` / `pastStates` / `futureStates`. Drops the handrolled `history: Person[][]` + `hIndex` from the prototype |
| immer | 11.1.4 | Structural state updates | Inside Zustand via `zustand/middleware/immer`. Lets mutations read like `state.people[i].name = ...` without breaking undo snapshotting |
| react-hook-form | 7.73.1 | Side-panel form state | Identity + Life sections are classic controlled-form territory; RHF avoids rerenders on every keystroke and ships a `useFieldArray` fit for pronouns/etc. |
| zod | 4.3.6 | Schema validation | Share one schema between client form, server action, and DB insert. v4's `.pipe`/`.transform` handle birthYear coercion cleanly |
| @hookform/resolvers | 5.2.2 | RHF ↔ Zod glue | Standard pairing |
| lucide-react | 1.8.0 | Icon set | Handoff explicitly lists Lucide equivalents (User, Plus, Undo2, Redo2, Maximize2, Sparkles, Share2, Trash2, ExternalLink, …). 1:1 swap with `icons.jsx` |
| clsx | 2.1.1 | Conditional className joiner | Tiny utility, used everywhere for selected/hover variants |
| tailwind-merge | 3.3.0 | Class conflict resolution | Pair with clsx as `cn()` util — avoids `"p-2 p-4"` style bugs when composing node variants |
| nanoid | 5.1.7 | ID generation | Replaces the prototype's `uid()`. URL-safe, collision-resistant for `Person.id`, tree ids, invite ids |
| date-fns | 4.1.3 | Date formatting (Saved pill, invited-at) | Tree-shakeable; only pull `formatDistanceToNow` and `format` |
| react-hot-toast | 2.7.0 | Toast messages (handoff spec) | Matches handoff's 2.2s auto-dismiss center-bottom toast; ~4kb; no Portal boilerplate |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | 4.1.5 | Unit tests for `model.ts` | Pure-function tests: `computeEdges`, `addRelative`, `removeWithCleanup`, collision-nudge, dagre-layout adapter. Fast, Vite-native |
| @vitejs/plugin-react | 5.0.4 | Vitest JSX/TSX transform | Only needed if you test React components with @testing-library |
| @testing-library/react | 17.0.2 | Component tests | For side-panel form and radial menu; React 19 compatible |
| @playwright/test | 1.59.1 | E2E canvas flows | Sign-in → add parent → add child → undo → tidy → share. Chromium-only in CI to save minutes |
| eslint | 9.x (flat config) | Linting | Use `eslint-config-next` 16.x and `@typescript-eslint` 8.x |
| prettier | 3.4.2 | Formatting | With `prettier-plugin-tailwindcss` so class order stays canonical |
| supabase CLI | 2.x | Local DB + migration management | `supabase init`, `supabase db reset`, `supabase start` for a local Postgres+Realtime; migrations checked in to `supabase/migrations/` |

## Installation

```bash
# Core framework + auth + db
npm install next@16.2.4 react@19.2.5 react-dom@19.2.5
npm install @clerk/nextjs@7.2.3
npm install @supabase/supabase-js@2.104.0 @supabase/ssr@0.10.2

# Canvas domain
npm install @dagrejs/dagre@3.0.0
npm install zustand@5.0.12 zundo@2.3.0 immer@11.1.4

# Forms + UX
npm install react-hook-form@7.73.1 zod@4.3.6 @hookform/resolvers@5.2.2
npm install lucide-react@1.8.0
npm install clsx@2.1.1 tailwind-merge@3.3.0
npm install nanoid@5.1.7 date-fns@4.1.3
npm install react-hot-toast@2.7.0

# Dev
npm install -D typescript@6.0.3
npm install -D tailwindcss@4.2.4 @tailwindcss/postcss@4.2.4
npm install -D vitest@4.1.5 @vitejs/plugin-react@5.0.4
npm install -D @testing-library/react@17.0.2 @testing-library/user-event@14.6.1 jsdom@25.0.1
npm install -D @playwright/test@1.59.1
npm install -D eslint@9.28.0 eslint-config-next@16.2.4
npm install -D prettier@3.4.2 prettier-plugin-tailwindcss@0.6.11
```

## Gap-Filling Decisions (required by the brief)

### 1. Pan/zoom library: **custom CSS transform, NOT react-zoom-pan-pinch, NOT React Flow**

**Decision:** Hand-roll the transform using one wrapper `div` with `style={{ transform: \`translate(${x}px, ${y}px) scale(${k})\` }}` over a child grid of `PersonNode` divs positioned by `left/top`. Attach `wheel` (with `ctrlKey` for zoom), `mousedown`/`mousemove`/`mouseup` (for pan on empty-space drag), and per-node `pointerdown` drag that divides deltas by the current `k` to stay in canvas-space.

**Why:**
1. **The handoff already specifies this model.** `app.jsx` uses `transform: translate(x,y) scale(k)` on a single parent. Swapping that out for a library means rewriting the rendering layer to fit the library's abstraction, and then rewriting it *again* when the library's constraints (e.g., TransformComponent's overflow/positioning) conflict with the design.
2. **`react-zoom-pan-pinch` is image/content-centric.** It's excellent for zooming a single `<img>` or static document; it actively fights per-child drag because it owns the pointer events. GitHub issue [#297](https://github.com/BetterTyped/react-zoom-pan-pinch/issues/297) ("react zoom pan pinch disables my canvas hover and click") is representative. The `excluded` class escape hatch works for buttons, not for a whole node layer where every node needs drag + click + hover.
3. **React Flow is a node-graph editor with its own mental model.** It owns node state, handle connections, edge routing, and selection. Adapting it to the handoff (SVG edges *derived* from `spouseIds`/`parentIds`, radial-add menu anchored to the selected node, couple-as-merged-node layout, no handle-based drawing UI) means disabling most of what React Flow gives you while still shipping its ~80kb bundle. Performance data also shows frame drops with many custom-React nodes (issue [#4711](https://github.com/xyflow/xyflow/issues/4711)). **Reconsider React Flow only if** the product pivots to user-drawn connections, where its handle API earns its weight.
4. **The custom transform is ~120 lines.** Pan = `onMouseDown` on empty canvas, track `dx/dy`, update `transform.x/y`. Zoom = `onWheel` when `e.ctrlKey || e.metaKey`, scale around pointer position (standard formula: `k' = k * factor; x' = mouseX - (mouseX - x) * factor`). Node drag = `onPointerDown` on node, `dx/k, dy/k` applied to `person.x/y`. That's it.
5. **d3-zoom is an option** for the transform math, but even that is more ceremony than needed for a warm, purpose-built canvas.

**Implementation pattern (recommended):**
```tsx
// <Canvas/>
<div
  ref={outerRef}
  onMouseDown={startPan}
  onWheel={onWheel}
  className="relative h-full w-full overflow-hidden bg-[var(--bg)]"
>
  <div
    className="absolute inset-0 origin-top-left"
    style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}
  >
    <svg className="pointer-events-none absolute inset-0 overflow-visible">
      {edges.map(e => <EdgePath key={e.id} edge={e} />)}
    </svg>
    {people.map(p => <PersonNode key={p.id} person={p} onDrag={dragNode} />)}
  </div>
  <DotGridBackground transform={t} /> {/* separate CSS background, not transformed */}
</div>
```

Confidence: **HIGH.** This is the mainstream path for Figma-like canvases built from scratch.

### 2. State management: **Zustand + zundo + immer, NOT useReducer**

**Decision:** One Zustand store for `people`, `selectedId`, `sidePanelOpen`, `radial`, `transform`, `toast`, `shareOpen`. Wrap with `temporal` (zundo) for `history` and `hIndex`. Wrap inner with `immer` for ergonomic mutations.

**Why:**
1. **Handoff's state is non-trivial.** ~9 top-level fields plus derived `edges = computeEdges(people)`. `useReducer` forces a discriminated-union action type and a 200+ line reducer; Zustand actions are regular functions and tree-shake cleanly across files.
2. **zundo is purpose-built for this.** `temporal()` wraps the store and snapshots on each `set()`, with `partialize` to exclude non-undoable state (selection, transform, UI open flags). Replaces the prototype's `history: Person[][]` + `hIndex: number` with `useStore.temporal.getState().undo()` / `redo()`.
3. **immer makes structural mutations readable.** `addRelative(anchorId, 'parent')` touches `state.people[parentIdx].childIds`, `state.people[anchorIdx].parentIds`, and pushes a new `Person` — three places, zero spread operators.
4. **SSR safety:** Create the store per-request when reading initial data in a Server Component, hydrate to client via a store provider pattern. Well-documented in Zustand docs under "Setup with Next.js".

**Snapshot shape with zundo:**
```ts
const useTree = create(
  temporal(
    immer<TreeState>((set) => ({
      people: [],
      selectedId: null,
      // ...
      addRelative: (anchorId, kind) => set((s) => {
        // direct mutation, zundo snapshots the result
      }),
    })),
    {
      partialize: (s) => ({ people: s.people }), // only `people` is undoable
      limit: 50, // bound memory
    }
  )
);
```

Confidence: **HIGH.**

### 3. Dagre integration for couples-as-merged-nodes

**Decision:** Feed dagre a synthetic graph where each marriage couple collapses into one node. After layout, expand the couple-node back into two `Person` positions spaced by the handoff's `COUPLE_GAP = 24`.

**Algorithm:**
```ts
// 1. Group people into "units": a unit is either a single person or a married couple
type Unit = { id: string; memberIds: string[]; width: number; height: number };

function buildUnits(people: Person[]): Unit[] {
  const seen = new Set<string>();
  const units: Unit[] = [];
  for (const p of people) {
    if (seen.has(p.id)) continue;
    const spouse = p.spouseIds[0] && people.find(x => x.id === p.spouseIds[0]);
    if (spouse && !seen.has(spouse.id)) {
      seen.add(p.id); seen.add(spouse.id);
      units.push({
        id: `couple:${p.id}:${spouse.id}`,
        memberIds: [p.id, spouse.id],
        width: NODE_W * 2 + COUPLE_GAP,   // 180*2 + 24 = 384
        height: NODE_H,                    // 76
      });
    } else {
      seen.add(p.id);
      units.push({ id: `solo:${p.id}`, memberIds: [p.id], width: NODE_W, height: NODE_H });
    }
  }
  return units;
}

// 2. Edges = for each person with parents, draw unit(child) ← unit(parent-couple-or-single)
function buildUnitEdges(people: Person[], units: Unit[]): Array<[string, string]> {
  const unitOf = new Map<string, string>();
  units.forEach(u => u.memberIds.forEach(m => unitOf.set(m, u.id)));
  const edges: Array<[string, string]> = [];
  for (const p of people) {
    if (p.parentIds.length === 0) continue;
    const childUnit = unitOf.get(p.id)!;
    const parentUnit = unitOf.get(p.parentIds[0])!; // both parents map to same couple-unit
    edges.push([parentUnit, childUnit]);
  }
  return Array.from(new Set(edges.map(e => e.join('>')))).map(s => s.split('>') as [string, string]);
}

// 3. Run dagre
import Dagre from '@dagrejs/dagre';
const g = new Dagre.graphlib.Graph();
g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 120 - 76 /* handoff's 120 gap is center-to-center minus node height */ });
g.setDefaultEdgeLabel(() => ({}));
units.forEach(u => g.setNode(u.id, { width: u.width, height: u.height }));
unitEdges.forEach(([s, t]) => g.setEdge(s, t));
Dagre.layout(g);

// 4. Expand couple-units back into per-Person positions
const nextPeople = people.map(p => { /* compute x,y from g.node(unitOf.get(p.id)) */ });
```

**Why this pattern:**
- **Dagre doesn't natively understand marriages** — both parents in a couple must share the same y and be horizontally adjacent. Merging them pre-layout is the standard workaround (used by every genealogy-on-dagre project).
- **Children hang off the couple-node**, so dagre automatically centers the parent-pair mid-span over the children — matching the handoff's "orthogonal path down from parent-pair midpoint" edge style.
- **Single parents** (divorced/deceased/unrecorded spouse) stay as solo units with `width: NODE_W`. This also handles `isMe` at the root with no spouse.
- **Multiple marriages** (step-children scenario): for v1, pick the first spouse with shared children as the canonical couple; stash the alternate as a solo unit linked by spouse-edge only. Document this tradeoff.

Use dagre only for the Tidy button (per handoff). Do NOT auto-relayout on add — the collision-nudge pattern is preserved for the add-relative flow.

Confidence: **HIGH** on the approach; **MEDIUM** on exact nodesep/ranksep numbers — tune empirically against the sample tree in `model.jsx`.

### 4. SVG edge rendering

**Decision:** Single `<svg>` element absolutely positioned inside the transform wrapper, `overflow: visible`, `pointer-events: none`. Inside, one `<path>` per edge with orthogonal D-string. Edges are **derived** from `people` via `computeEdges(people)` memoized with `useMemo`, called on every `people` change.

**Why one SVG, not one per edge:**
- DOM node count stays tied to edges not edge-parts.
- Single repaint on transform changes.
- `overflow: visible` on the SVG + no clip means edges can extend past any inferred bbox (edges routed between far-apart branches).

**Edge D-string generator:**
```ts
// Spouse: horizontal line between two nodes at same y
function spouseD(a: Point, b: Point) {
  const y = a.y + NODE_H / 2;
  return `M ${a.x + NODE_W} ${y} L ${b.x} ${y}`;
}

// Parent-child: orthogonal (down from couple midpoint, across, down into child)
function parentChildD(parentMid: Point, child: Point) {
  const midY = (parentMid.y + NODE_H + child.y) / 2;
  const cx = child.x + NODE_W / 2;
  return `M ${parentMid.x} ${parentMid.y + NODE_H} V ${midY} H ${cx} V ${child.y}`;
}
```

Stroke: `var(--rule)` at `1.5`. `vector-effect="non-scaling-stroke"` so lines stay crisp at any zoom level.

**Performance budget:** 200 people → ~250 edges → 250 `<path>` elements → trivial. SVG starts to hurt around 5000 elements; we'll be one order below that even for extended families.

Confidence: **HIGH.**

### 5. Supabase Realtime patterns

**Two channels per tree, not one:**

1. **Presence channel** (`tree:${treeId}:presence`, `config.presence.enabled: true`): Users track themselves with `{ userId, name, avatar, color }`. Populates the avatar stack in the topbar.
2. **Broadcast channel** (`tree:${treeId}:edits`, `config.broadcast: { self: false }`): Live edit events. Every mutation (addRelative, updateField, move, remove) does:
   - Optimistic local apply
   - Supabase mutation (via Server Action from client → server)
   - Broadcast `{ type: 'person.upsert' | 'person.delete', payload }` to peers
   - Peers apply to their store (skipping their own broadcasts via `self: false`)

**Use private channels** (`config.private: true`) so RLS runs on channel join with the Clerk JWT, matching the `treeId`-access policy on the `trees` table. This prevents unauthorized users from subscribing even if they guess the channel name.

**DO NOT use Postgres CDC (Replication) for this.** It's tempting — auto-broadcast of DB changes — but:
- Higher latency (100-500ms vs. 30-80ms for broadcast)
- No way to attach the sender's identity cleanly (you'd have to store user_id on every row and filter)
- RLS-per-row means CDC has to evaluate RLS for every subscriber per change — slow at scale

Broadcast + explicit payload gives you latency, cleanly identified senders (payload includes `senderId`), and no DB-side subscription cost.

Confidence: **HIGH.**

### 6. Clerk + Next 16 App Router pattern (third-party auth with Supabase)

**⚠️ The old JWT template approach is deprecated as of April 2025.** Do NOT create a Clerk JWT template called "supabase" — that's v1 guidance. Use the native third-party-auth integration.

**Setup:**
1. In Supabase dashboard → Authentication → Third Party Auth, add Clerk. Paste the Clerk domain (`your-app.clerk.accounts.dev` in dev, your custom domain in prod).
2. In Clerk dashboard → JWT Templates → enable "Issue session tokens with `role: 'authenticated'` claim" (on by default for Supabase integration).

**Server Component (RSC) pattern:**
```ts
// lib/supabase/server.ts
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken() ?? null;
      },
    }
  );
}

// app/tree/[id]/page.tsx  (Server Component)
export default async function TreePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: people } = await supabase.from('people').select('*').eq('tree_id', id);
  return <CanvasClient initialPeople={people ?? []} treeId={id} />;
}
```

**Middleware:**
```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
const isProtected = createRouteMatcher(['/tree(.*)', '/settings(.*)']);
export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});
export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)', '/(api|trpc)(.*)'],
};
```

**RLS pattern (given Clerk is the JWT issuer):**
```sql
-- people are scoped by tree; access granted via tree_members
create policy "read own trees" on people for select
  using (
    exists (
      select 1 from tree_members tm
      where tm.tree_id = people.tree_id
        and tm.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
```

`auth.jwt() ->> 'sub'` returns Clerk's `user_xxxxx` id. Store that as `clerk_user_id` (text), NOT `auth.users(id)` — there are no Supabase Auth users in this integration; Supabase only verifies the Clerk JWT.

**Client-side Supabase (for Realtime subscriptions in the canvas):**
```ts
// lib/supabase/client.ts  (use 'use client')
'use client';
import { useAuth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

export function useSupabase() {
  const { getToken } = useAuth();
  return useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { async accessToken() { return (await getToken()) ?? null; } }
    ),
    [getToken]
  );
}
```

Confidence: **HIGH** (verified against both Supabase and Clerk docs, April 2026).

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Custom CSS transform | `react-zoom-pan-pinch` | Never for this project. Good for zooming a single static image/document, not an interactive multi-node canvas |
| Custom CSS transform | React Flow (`@xyflow/react` 12.10.2) | If product pivots to user-drawn arbitrary edges (handle-based connection drawing). Otherwise it's overweight for derived edges |
| Custom CSS transform | `d3-zoom` | If you want battle-tested zoom math (semantic vs. geometric) and are comfortable with imperative D3 inside a React effect. Net win is ~20 lines of math; net cost is a 30kb dep + d3 idiomatic break |
| `@dagrejs/dagre` | `elkjs` | If Tidy layout quality on 100+ person trees is visibly worse than dagre (unlikely) OR you need edge-routing around obstacles. Tradeoff: elkjs is a 900kb WASM+JS bundle vs dagre's ~60kb; run it in a Web Worker |
| `@dagrejs/dagre` | `d3-hierarchy` (Reingold-Tilford) | If you drop marriage-aware layout entirely and only draw parent-child hierarchy (no spouse edges). Cleaner for strict trees but loses the "couple centered over children" aesthetic |
| Zustand + zundo | `useReducer` + handrolled history | If you prefer to stay std-React and tolerate the reducer boilerplate. Prototype's `history: Person[][]` approach works; zundo just automates it |
| Zustand | `jotai` | If you prefer atomic state (per-person atoms) and want to optimize re-renders without selectors. More idiomatic React, but family-tree state is graph-shaped not atomic; selectors are simpler |
| Zustand | `redux-toolkit` | If team already uses RTK. Otherwise the RTK+RTK-Query bundle is 4x Zustand's |
| React Hook Form + Zod | `@tanstack/react-form` | TanStack Form is the rising v4 option; API is nice but ecosystem smaller. Stick with RHF for now — it's the de-facto standard in 2026 and the docs are deeper |
| Clerk third-party auth | Supabase Auth (email + OAuth) | If you want to drop a paid dependency. Supabase Auth handles Google/Apple too, but the UX polish of Clerk's hosted sign-in components is noticeably better and matches the handoff's "3 buttons, no form" aesthetic with zero CSS work |
| Broadcast (Realtime) | Postgres CDC replication | If you want zero client-side mutation orchestration and can tolerate 200-500ms latency on peer updates. Not recommended here — collaborative canvas demands sub-100ms |
| Vercel | Cloudflare Workers + Hyperdrive | If team needs edge-compute for geo-distributed users. Overkill for a family-tree app; Vercel's Next 16 support is best-in-class |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `dagre` (unscoped, 0.8.5) | Package is frozen since 2020; maintenance moved to `@dagrejs/dagre` (3.0.0+). Known bug with ES modules in Next.js 14+ | `@dagrejs/dagre@3.0.0` |
| Clerk JWT Template for Supabase | **Deprecated 2025-04-01.** Old `NEXT_PUBLIC_SUPABASE_*` + custom `supabase` JWT template pattern is being removed. New installs won't work | Supabase native third-party auth with Clerk (see pattern above) |
| `@supabase/auth-helpers-nextjs` | Deprecated; replaced by `@supabase/ssr` | `@supabase/ssr@0.10.2` |
| `supabase-js` v1 / `createClient` without `accessToken` option | Cannot inject Clerk JWT cleanly; you end up with two auth contexts | `supabase-js@2.104.0` with the `accessToken` option |
| Next.js 14 (per PROJECT.md) | Stale; `@clerk/nextjs@7` requires Next 16. Tailwind v4 setup assumes Next 15+ | Next.js 16.2.4 (update PROJECT.md) |
| Pages Router / `getServerSideProps` | Disables all RSC wins and doubles auth boilerplate | App Router exclusively |
| Babel / webpack custom setups | Next 16 uses Turbopack by default in dev AND build; no need to touch bundler | Default Next build pipeline |
| `redux` + `redux-saga` | Massive for this scope; async orchestration is better as plain async/await inside Zustand actions | Zustand + zundo |
| `styled-components` / `emotion` | Tailwind v4 covers 100% of handoff styling with zero runtime cost; mixing CSS-in-JS fights Tailwind's `@theme` tokens | Tailwind v4 with CSS variables |
| `lodash` | Every named util you need is one-line native; import cost unjustified | Native JS / one-function utilities (nanoid, clsx, date-fns) |
| `moment` | Deprecated, 300kb; date-fns is tree-shakeable | date-fns 4.1.3 |
| `react-draggable` inside the transform | Its drag math doesn't divide by the parent's scale, so dragging feels "off" as you zoom in | Hand-written pointer handlers that read `transform.k` from Zustand and divide deltas |
| Jest | Slower than Vitest; config pain with ESM + TS + JSX | Vitest 4 |
| Cypress | Playwright has better multi-tab and real auth handling (needed for testing Share flow with two browser contexts) | Playwright 1.59 |

## Stack Patterns by Variant

**If v1 stays within handoff scope (≤500 nodes per tree):**
- Custom CSS transform + derived SVG edges. No virtualization needed.
- Full-state history snapshots via zundo (limit 50 past states).

**If a tree grows past ~1000 nodes in practice:**
- Move dagre layout to a Web Worker (`new Worker(new URL('./layout.worker.ts', import.meta.url))`) — 1000-node dagre takes ~200ms on main thread; that will jank the Tidy animation.
- Consider viewport-culled node rendering (don't render nodes whose post-transform bbox is outside the visible canvas). `react-virtuoso` or hand-rolled with `IntersectionObserver`.

**If you later need offline/poor-network support:**
- Wrap the Supabase client in an IndexedDB cache via `@supabase/cache-helpers` + `idb`. Replay mutations on reconnect.
- Zustand's `persist` middleware can mirror the store to IndexedDB; use `JSON.stringify` with a schema-version field for migrations.

**If mobile becomes a priority post-v1:**
- Add touch event handling to the custom transform (pinch-zoom: track two pointers, update `k` by distance ratio). Currently out of scope per PROJECT.md.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| next@16.2.4 | react@19.2.x, typescript@5.4+ or 6.x | Requires Node.js ≥20.9 |
| @clerk/nextjs@7.2.3 | next@15 or 16, react@18.3+ or 19 | v7 is Core 3; don't mix with `@clerk/clerk-react` v4 |
| @supabase/ssr@0.10.2 | next@13+ App Router | Works with @supabase/supabase-js@2.45+ |
| @supabase/supabase-js@2.104.0 | All Node/browser envs | `accessToken` option needs v2.48+, well-satisfied |
| tailwindcss@4.2.4 | next@15+ via @tailwindcss/postcss | v4 requires browsers with `@property` support (baseline 2023) — fine for desktop-first family tree |
| zod@4.3.6 | @hookform/resolvers@5.2.2 | Zod v4 broke v3 resolver; MUST use resolvers ≥5.0. Do not pin zod@3 |
| react-hook-form@7.73.1 | react@18 or 19 | No v8 yet; v7 line is stable |
| @xyflow/react@12.10.2 | react@19 | *(Only relevant if you ignore the recommendation and use React Flow)* |
| @dagrejs/dagre@3.0.0 | Node ≥18, all bundlers | Pure JS; ESM + CJS dual-published; no native deps |
| vitest@4.1.5 | vite@6, react@19 | Needs `@vitejs/plugin-react@5` for React 19 JSX transform |
| @playwright/test@1.59.1 | Node ≥20 | Chromium 136 / WebKit 18.4 / Firefox 138 shipped |

## Sources

**Context7 library docs (HIGH confidence — verified 2026-04-21):**
- `/vercel/next.js` — App Router / RSC / Next 16 migration (`cacheComponents`, stable config properties)
- `/clerk/clerk-docs` — `clerkMiddleware`, `auth()`, `currentUser()`, App Router server helpers, v7/Core 3 upgrade guide
- `/supabase/realtime` — Presence, Broadcast, private channels with JWT
- `/dagrejs/dagre` — graph construction, `rankdir`/`nodesep`/`ranksep`, layout output schema
- `/websites/reactflow_dev` — Dagre-with-React-Flow example (referenced to validate our "don't use React Flow" logic)
- `/pmndrs/zustand` — immer middleware, SSR patterns
- `/charkour/zundo` — temporal middleware API
- `/bettertyped/react-zoom-pan-pinch` — TransformWrapper/TransformComponent API (referenced to validate "don't use this")
- `/react-hook-form/react-hook-form` — v7 API
- `/microsoft/playwright` — v1.59 test APIs
- `/vitest-dev/vitest` — v4 config

**Official docs (HIGH confidence):**
- [Supabase + Clerk third-party auth](https://supabase.com/docs/guides/auth/third-party/clerk) — verified the JWT-template deprecation (2025-04-01) and the native-integration pattern
- [Clerk Supabase integration guide](https://clerk.com/docs/guides/development/integrations/databases/supabase) — verified the `accessToken` client pattern, env var names, and `auth.jwt() ->> 'sub'` for RLS
- [Next.js 16 upgrade guide](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/upgrading/version-16.mdx) — `cacheComponents`, stable PPR
- [Tailwind v4 theme docs](https://tailwindcss.com/docs/theme) — `@theme` directive, CSS variable generation
- [React Flow performance guide](https://reactflow.dev/learn/advanced-use/performance) — confirmed React Flow's weight for our scope

**npm registry (HIGH confidence, queried 2026-04-21):** All package versions listed above were confirmed live against `npm view <pkg> version`.

**Web search (MEDIUM confidence, cross-referenced with above):**
- [Tailwind CSS v4.0 blog](https://tailwindcss.com/blog/tailwindcss-v4) — Oxide engine, CSS-first config
- [xyflow GitHub discussion #4975](https://github.com/xyflow/xyflow/discussions/4975) — React Flow performance with many nodes
- [react-zoom-pan-pinch issue #297](https://github.com/BetterTyped/react-zoom-pan-pinch/issues/297) — representative of the library fighting per-child interactions

---
*Stack research for: Collaborative pan/zoom family tree canvas*
*Researched: 2026-04-21*
