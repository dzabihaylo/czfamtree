<!-- GSD:project-start source:PROJECT.md -->
## Project

**CZ Family Tree**

A collaborative, multi-generational family tree web app. Users sign in, land on a pan/zoom canvas showing their family, and add relatives (parent, spouse, child, sibling) inline via a radial menu. Each person has a detail side panel. Trees can be shared with other family members (edit/view) with live presence. Target feel is **a focused canvas tool** — somewhere between Figma's infinite canvas and a lightweight CRM — not a dense genealogy database.

**Core Value:** A person can open the app, see their family laid out on a clean canvas, and add/edit relatives without friction. If the canvas + radial-add loop doesn't feel effortless, nothing else matters.

### Constraints

- **Tech stack**: Next.js 16 App Router + React 19 + TypeScript + Tailwind v4 — Clerk 7 (current Core 3) requires Next 16 / React 19; staying on Next 14 forces legacy Clerk 5.
- **Auth**: Clerk 7 + Supabase native third-party auth (NOT the deprecated JWT template). RLS uses `auth.jwt()->>'sub'` (Clerk userId is a text string, not a UUID — `auth.uid()` does NOT work).
- **Database**: Supabase Postgres with Row Level Security + Realtime — one vendor for persistence and presence.
- **Layout library**: `@dagrejs/dagre@3.x` (NOT the unscoped `dagre` frozen at 0.8.5). Couples-as-merged-nodes pattern, children as edges from the couple-node.
- **State management**: Zustand 5 + `zundo` temporal middleware + `immer` — replaces the prototype's hand-rolled history array. Store factory + Context Provider (never module-scoped, SSR would leak).
- **Testing**: Vitest (unit for `model.ts`: edges, layout, mutations) + Playwright (E2E for canvas flows).
- **Deployment**: Vercel — native Next.js hosting. Pin Next.js to a post-CVE-2025-29927 release (≥14.2.25 / ≥15.2.3 / Next 16 already safe).
- **Design fidelity**: Pixel-parity with handoff tokens defined in `styles.css` (colors, typography, spacing, radii, shadow). Tailwind v4 `@theme` block maps the handoff's `:root` CSS variables 1:1.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
- `@clerk/nextjs@7` (Core 3) requires Next 16 / React 19. Pinning to Next 14 forces Clerk 5 (Core 1), which is in legacy support.
- Next 16 deprecates `experimental.dynamicIO` → `cacheComponents: true`, which is relevant for the tree-data-fetching pattern (server component reads tree, client component renders canvas).
- Tailwind v4 + Next 16 is now the default starter; v3 is no longer recommended for new projects.
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
# Core framework + auth + db
# Canvas domain
# Forms + UX
# Dev
## Gap-Filling Decisions (required by the brief)
### 1. Pan/zoom library: **custom CSS transform, NOT react-zoom-pan-pinch, NOT React Flow**
### 2. State management: **Zustand + zundo + immer, NOT useReducer**
### 3. Dagre integration for couples-as-merged-nodes
- **Dagre doesn't natively understand marriages** — both parents in a couple must share the same y and be horizontally adjacent. Merging them pre-layout is the standard workaround (used by every genealogy-on-dagre project).
- **Children hang off the couple-node**, so dagre automatically centers the parent-pair mid-span over the children — matching the handoff's "orthogonal path down from parent-pair midpoint" edge style.
- **Single parents** (divorced/deceased/unrecorded spouse) stay as solo units with `width: NODE_W`. This also handles `isMe` at the root with no spouse.
- **Multiple marriages** (step-children scenario): for v1, pick the first spouse with shared children as the canonical couple; stash the alternate as a solo unit linked by spouse-edge only. Document this tradeoff.
### 4. SVG edge rendering
- DOM node count stays tied to edges not edge-parts.
- Single repaint on transform changes.
- `overflow: visible` on the SVG + no clip means edges can extend past any inferred bbox (edges routed between far-apart branches).
### 5. Supabase Realtime patterns
- Higher latency (100-500ms vs. 30-80ms for broadcast)
- No way to attach the sender's identity cleanly (you'd have to store user_id on every row and filter)
- RLS-per-row means CDC has to evaluate RLS for every subscriber per change — slow at scale
### 6. Clerk + Next 16 App Router pattern (third-party auth with Supabase)
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
- Custom CSS transform + derived SVG edges. No virtualization needed.
- Full-state history snapshots via zundo (limit 50 past states).
- Move dagre layout to a Web Worker (`new Worker(new URL('./layout.worker.ts', import.meta.url))`) — 1000-node dagre takes ~200ms on main thread; that will jank the Tidy animation.
- Consider viewport-culled node rendering (don't render nodes whose post-transform bbox is outside the visible canvas). `react-virtuoso` or hand-rolled with `IntersectionObserver`.
- Wrap the Supabase client in an IndexedDB cache via `@supabase/cache-helpers` + `idb`. Replay mutations on reconnect.
- Zustand's `persist` middleware can mirror the store to IndexedDB; use `JSON.stringify` with a schema-version field for migrations.
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
- [Supabase + Clerk third-party auth](https://supabase.com/docs/guides/auth/third-party/clerk) — verified the JWT-template deprecation (2025-04-01) and the native-integration pattern
- [Clerk Supabase integration guide](https://clerk.com/docs/guides/development/integrations/databases/supabase) — verified the `accessToken` client pattern, env var names, and `auth.jwt() ->> 'sub'` for RLS
- [Next.js 16 upgrade guide](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/upgrading/version-16.mdx) — `cacheComponents`, stable PPR
- [Tailwind v4 theme docs](https://tailwindcss.com/docs/theme) — `@theme` directive, CSS variable generation
- [React Flow performance guide](https://reactflow.dev/learn/advanced-use/performance) — confirmed React Flow's weight for our scope
- [Tailwind CSS v4.0 blog](https://tailwindcss.com/blog/tailwindcss-v4) — Oxide engine, CSS-first config
- [xyflow GitHub discussion #4975](https://github.com/xyflow/xyflow/discussions/4975) — React Flow performance with many nodes
- [react-zoom-pan-pinch issue #297](https://github.com/BetterTyped/react-zoom-pan-pinch/issues/297) — representative of the library fighting per-child interactions
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
