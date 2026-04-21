---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [nextjs, react19, typescript, tailwindcss-v4, clerk, supabase, zustand, zundo, immer]

# Dependency graph
requires: []
provides:
  - Next.js 16.2.4 App Router scaffold (Turbopack, React 19)
  - Clerk 7 middleware at repo root gating every non-static route
  - Supabase-js 2.104 client factories (server + browser) that inject Clerk JWT via accessToken
  - Clerk auth helpers (getUserIdOrThrow / getUserIdOrNull / getUserProfile) that project currentUser to plain objects
  - Tailwind v4 @theme block mapping all handoff OKLCH tokens + 4px spacing scale + 2-weight Inter / 1-weight JetBrains Mono fonts
  - Zustand 5 + zundo 2 + immer 11 store factory with React Context Provider (SSR-safe, no module-scoped singleton)
  - Dev toolchain: Vitest 4 (jsdom) + Playwright 1.59 (chromium) + ESLint flat config + Prettier + Tailwind plugin
affects: [02-foundation schema, 03-canvas, 04-authoring, 05-tidy, 06-share]

# Tech tracking
tech-stack:
  added:
    - next@16.2.4
    - react@19.2.5 / react-dom@19.2.5
    - typescript@6.0.3
    - tailwindcss@4.2.4 / @tailwindcss/postcss@4.2.4
    - "@clerk/nextjs@7.2.3"
    - "@supabase/supabase-js@2.104.0"
    - react-hook-form@7.73.1 / zod@4.3.6 / "@hookform/resolvers@5.2.2"
    - lucide-react@1.8.0
    - zustand@5.0.12 / zundo@2.3.0 / immer@11.1.4
    - clsx@2.1.1 / tailwind-merge@3.3.0 / nanoid@5.1.9
    - vitest@4.1.5 / "@vitejs/plugin-react@5.0.4" / jsdom@25.0.1
    - "@testing-library/react@16.3.2" (plan called 17.0.2 which does not exist on npm)
    - "@testing-library/user-event@14.6.1"
    - "@playwright/test@1.59.1"
    - eslint@9.28.0 / eslint-config-next@16.2.4 / prettier@3.4.2 / prettier-plugin-tailwindcss@0.6.11
    - supabase@2.0.0 (CLI, dev-dep)
  patterns:
    - "Clerk + Supabase native third-party auth: middleware at repo root, Supabase factories inject Clerk JWT via accessToken() callback — no deprecated JWT template, no @supabase/ssr, no @supabase/auth-helpers-nextjs"
    - "Auth helper returns plain object (id/displayName/email/avatarUrl) — never passes Clerk User class across server/client boundary (Pitfall 1-4)"
    - "Tailwind v4 CSS-first: handoff :root OKLCH tokens copied verbatim; @theme block maps them to color-*/spacing-*/font-* — no tailwind.config.js"
    - "Zustand factory + React Context Provider (TreeStoreProvider) via useRef — never module-scoped; temporal + immer composed inside createStore"

key-files:
  created:
    - package.json
    - package-lock.json
    - tsconfig.json
    - next.config.ts
    - postcss.config.mjs
    - .env.local.example
    - .prettierrc
    - eslint.config.mjs
    - vitest.config.ts
    - playwright.config.ts
    - middleware.ts
    - lib/supabase/browser.ts
    - lib/supabase/server.ts
    - lib/auth.ts
    - lib/utils/cn.ts
    - lib/store/tree-store.ts
    - app/globals.css
    - app/layout.tsx
  modified:
    - supabase/config.toml (enabled [auth.third_party.clerk] block)
    - .gitignore (no changes needed — already covered test-results/ playwright-report/ .vercel/ supabase/.temp/)

key-decisions:
  - "Scaffolded configs manually rather than running create-next-app — directory already contained CLAUDE.md, .planning/, design_handoff_family_tree/, supabase/ and create-next-app refuses non-empty targets. Plan explicitly permitted this fallback."
  - "@testing-library/react pinned to 16.3.2 instead of plan's 17.0.2 (17.x does not exist on npm; 16.3.2 is latest and supports React 19)."
  - "npm install --legacy-peer-deps used (vite@7 peer requires @types/node>=20.19.0 but plan pinned 20.17.10). Plan permits this fallback. No broken resolutions observed in build or typecheck."
  - "lib/store/tree-store.ts implemented with React.createElement instead of JSX so file can keep .ts extension as declared in plan's files_modified list. JSX would require .tsx; functionally identical."
  - "Next 16 auto-rewrote tsconfig.json jsx: preserve -> react-jsx and added .next/dev/types/**/*.ts on first build. Kept Next's changes (mandatory for Next 16 RSC build pipeline)."

patterns-established:
  - "Clerk middleware at repo root (NOT app/ or src/) imported from @clerk/nextjs/server — defense-in-depth pattern for downstream server actions to also call auth() (Pitfall 1-3 + 1-6)"
  - "Supabase factories use accessToken callback to inject Clerk-issued JWT — RLS will use auth.jwt()->>'sub' (text) not auth.uid() (uuid)"
  - "Tailwind v4 @theme block (no tailwind.config.js) with OKLCH tokens copied verbatim from handoff styles.css — DESIGN-03 pixel-parity contract"
  - "Zustand store factory (createTreeStore) + React Context Provider (TreeStoreProvider via useRef) + selector hook (useTreeStore) — SSR-safe; module-scoped singleton explicitly forbidden and grep-verified absent"
  - "Exact-pinned dependencies everywhere (no ^, no ~) — prevents lockfile poisoning, supports reproducible Vercel builds"

requirements-completed:
  - DEP-02
  - DESIGN-03
  - AUTH-05

# Metrics
duration: 10min
completed: 2026-04-21
---

# Phase 01 Plan 01: Foundation scaffold Summary

**Next 16 + React 19 + Tailwind v4 scaffolded with Clerk 7 middleware, Supabase-js factories injecting Clerk JWT via accessToken, handoff OKLCH tokens in @theme, and an SSR-safe Zustand + zundo + immer store provider.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-21T18:49:38Z
- **Completed:** 2026-04-21T18:59:18Z
- **Tasks:** 4
- **Files created:** 18
- **Files modified:** 3 (supabase/config.toml, app/layout.tsx rewritten in Task 4, tsconfig.json auto-updated by Next build)

## Accomplishments

- Next.js 16.2.4 scaffold with exact-pinned React 19.2.5 / TS 6.0.3 / Tailwind 4.2.4 — `npm run build` succeeds on Turbopack
- Clerk 7.2.3 middleware at repo root (NOT `app/` or `src/`) gates every App Router route and `/(api|trpc)` routes; imported from `@clerk/nextjs/server`
- Supabase-js 2.104.0 factories (`lib/supabase/server.ts` + `lib/supabase/browser.ts`) both inject Clerk-issued JWT via `accessToken` async callback, referencing `NEXT_PUBLIC_SUPABASE_KEY` (not `_ANON_KEY`) and using `useSession` / `auth()` respectively
- `lib/auth.ts` exports `getUserIdOrNull` / `getUserIdOrThrow` / `getUserProfile`; `getUserProfile` returns a plain `{ id, displayName, email, avatarUrl }` object — never passes the Clerk `User` class across the server/client boundary (Pitfall 1-4 mitigation)
- `app/globals.css` contains all 13 handoff OKLCH tokens verbatim from `design_handoff_family_tree/source/styles.css` L2-21 plus a Tailwind v4 `@theme` block exposing them as `color-*` / `spacing-*` / `font-*` tokens, 4px spacing multiples, `radius 0` / `radius-avatar 9999px`, global `:focus-visible` accent ring, and `prefers-reduced-motion` override
- `app/layout.tsx` wraps `<ClerkProvider>` > `<html>` > `<body>` > `<TreeStoreProvider>` and loads Inter (weights 400 + 600 only, no 500) + JetBrains Mono (weight 400 only) via `next/font/google` with CSS variables
- `lib/store/tree-store.ts` ships the Zustand 5 + zundo 2 (`limit: 50`) + immer 11 store factory (`createTreeStore`) + React Context Provider (`TreeStoreProvider` via `useRef` — SSR-safe, NOT module-scoped) + selector hook (`useTreeStore`). Initial `TreeState`: `{ treeId, selectedPersonId, transform: { x, y, k } }` — Phase 2 extends with canvas data

## Task Commits

1. **Task 1: Scaffold project + install deps + configs** — `2b7e54e` (chore)
2. **Task 2: Clerk middleware + Supabase factories + auth helpers + cn util** — `73f0e3f` (feat)
3. **Task 3: globals.css Tailwind v4 @theme + layout.tsx with Clerk provider + fonts** — `81abb33` (feat)
4. **Task 4: Zustand store factory + zundo + immer + TreeStoreProvider + wire into layout** — `bd77062` (feat)

## Files Created/Modified

- `package.json` — 15 prod deps + 18 devDeps pinned exactly; Node ≥20.9 engine; test/e2e/typecheck scripts
- `package-lock.json` — 509 resolved packages (legacy peer deps mode)
- `tsconfig.json` — TS 6 strict, `@/*` path alias, Next auto-set `jsx: react-jsx`
- `next.config.ts` — `reactStrictMode: true`; `cacheComponents` deferred to Phase 2
- `postcss.config.mjs` — `@tailwindcss/postcss` plugin (v4 CSS-first)
- `.env.local.example` — 5 keys: Clerk pk/sk + Supabase URL/KEY (public anon) + optional CLERK_JWT_KEY
- `.prettierrc` — singleQuote + tailwind plugin for class sort stability
- `eslint.config.mjs` — flat config with `eslint-config-next`
- `vitest.config.ts` — jsdom + globals + react plugin for Phase 2-4 specs
- `playwright.config.ts` — chromium project, 3000 baseURL, CI-only webServer hook
- `middleware.ts` — `clerkMiddleware()` + matcher from Clerk reference repo (excludes `_next` + static assets)
- `lib/supabase/browser.ts` — `'use client'` hook using `useSession` + `createClient` with `accessToken` callback, memoized by session
- `lib/supabase/server.ts` — `'server-only'` factory calling `(await auth()).getToken()`
- `lib/auth.ts` — `ClerkUserId` branded type + `getUserIdOrNull` + `getUserIdOrThrow` + `getUserProfile` (plain-object projection)
- `lib/utils/cn.ts` — `cn(...inputs)` = `twMerge(clsx(inputs))`
- `lib/store/tree-store.ts` — `createTreeStore` factory + `TreeStoreProvider` + `useTreeStore` selector hook; built with `createElement` (no JSX) to keep `.ts` extension
- `app/globals.css` — `@import "tailwindcss"` + `:root` OKLCH tokens + `@theme` block + focus ring + reduced motion + `.grid-bg` utility
- `app/layout.tsx` — ClerkProvider > html > body > TreeStoreProvider; Inter 400/600 + JetBrains Mono 400
- `supabase/config.toml` — flipped `[auth.third_party.clerk] enabled = true` with placeholder `domain = "example.clerk.accounts.dev"`

## Decisions Made

- **Skipped `npx create-next-app`** — target directory is non-empty (CLAUDE.md + .planning/ + handoff + supabase/); plan's explicit fallback (manually author configs) was the correct path.
- **`@testing-library/react` pinned to 16.3.2** — plan's 17.0.2 does not exist on npm (Rule 3 auto-fix). 16.3.2 is latest release and supports React 19.
- **`npm install --legacy-peer-deps`** — `vite@7` (pulled by `vitest@4.1.5`) requires `@types/node>=20.19.0`, plan pinned `20.17.10`. Plan permits the flag; build and typecheck succeed, no broken runtime behavior observed.
- **Zustand provider implemented via `React.createElement`** — plan's `files_modified` list names `lib/store/tree-store.ts` (no JSX extension). Using `createElement` keeps the filename exact while still producing a valid React Context Provider. Functionally equivalent to JSX.
- **Kept Next 16's tsconfig.json auto-rewrite** — Next changed `jsx: preserve` → `jsx: react-jsx` and added `.next/dev/types/**/*.ts` to `include`. Both are mandatory in Next 16's build pipeline (RSC automatic runtime); reverting would re-break the build.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `@testing-library/react@17.0.2` does not exist on npm**
- **Found during:** Task 1 (`npm install`)
- **Issue:** `npm error notarget No matching version found for @testing-library/react@17.0.2.`
- **Fix:** Bumped pin to `16.3.2` (latest release as of 2026-04-21; peer deps: React 18/19, @types/react 18/19)
- **Files modified:** package.json
- **Verification:** `npm install --legacy-peer-deps` completes; 509 packages resolved
- **Committed in:** 2b7e54e (Task 1 commit)

**2. [Rule 3 - Blocking] Peer-dep conflict: vite@7 requires @types/node ≥ 20.19.0; plan pinned 20.17.10**
- **Found during:** Task 1 (`npm install`)
- **Issue:** ERESOLVE — vite@7.3.2 (transitively pulled by vitest@4.1.5) peerOptional `@types/node@^20.19.0 || >=22.12.0`, plan pinned `20.17.10`
- **Fix:** Used `npm install --legacy-peer-deps` — plan explicitly permits this fallback ("use `npm install --legacy-peer-deps` only if a peer conflict blocks install"). Did not bump @types/node to avoid drift from RESEARCH.md §1's verified version list.
- **Files modified:** package.json (unchanged), package-lock.json (produced under legacy mode)
- **Verification:** `npm install` completes; 509 packages; no runtime failures observed in `tsc --noEmit` or `npm run build`
- **Committed in:** 2b7e54e (Task 1 commit)

**3. [Rule 3 - Blocking] JSX in a .ts file does not compile**
- **Found during:** Task 4 (`tsc --noEmit` post-write)
- **Issue:** Plan specified `lib/store/tree-store.ts` but `<action>` code used JSX (`<TreeStoreContext.Provider ...>`). `tsc` reported TS1005 / TS1128 on line 39.
- **Fix:** Rewrote the Provider body with `React.createElement(TreeStoreContext.Provider, { value: storeRef.current }, children)` — keeps the `.ts` extension declared in the plan's `files_modified` list while producing a semantically identical Context Provider.
- **Files modified:** lib/store/tree-store.ts
- **Verification:** `tsc --noEmit` passes clean; `npm run build` succeeds; `grep -q "TreeStoreProvider"` in both tree-store.ts and layout.tsx passes; no module-scoped singleton.
- **Committed in:** bd77062 (Task 4 commit)

**4. [Rule 3 - Auto-applied] Next 16 auto-rewrote tsconfig.json on first build**
- **Found during:** Task 4 (`npm run build`)
- **Issue:** Next 16 mandatory change: `jsx: preserve` → `jsx: react-jsx` (React automatic runtime); add `.next/dev/types/**/*.ts` to include
- **Fix:** Accepted Next's rewrite (no revert). These are required for Next 16's RSC build pipeline.
- **Files modified:** tsconfig.json
- **Verification:** `npm run build` succeeds with the rewritten config.
- **Committed in:** bd77062 (Task 4 commit)

---

**Total deviations:** 4 auto-fixed (3 blocking, 1 auto-applied by Next)
**Impact on plan:** None of the deviations affected the plan's success criteria. All three blocking issues were planning-time version/pin mismatches with actual npm reality (or a Typescript/file-extension oversight); no scope creep, no spec changes. Rule 4 (architectural) was never triggered.

## Issues Encountered

- **Next 16 deprecation notice:** `The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy` — notice only, not an error. `middleware.ts` still works in Next 16.2.4 and is what the plan + RESEARCH.md + Clerk reference repo all specify. A follow-up plan may rename to `proxy.ts` when Clerk reference code updates; not blocking.
- **npm audit reports 2 high-severity vulnerabilities** — not investigated in this plan (scope boundary). Will log to `deferred-items.md` if the vulnerabilities persist after a fresh `npm install` in Phase 2.

## User Setup Required

User still needs to complete before `npm run dev` will boot a functional app (Clerk + Supabase must both serve JWTs):

1. **Copy env template:** `cp .env.local.example .env.local`
2. **Fill `.env.local` with Clerk keys:** Clerk Dashboard → API Keys → Publishable key + Secret key
3. **Fill `.env.local` with Supabase keys:** Supabase Dashboard → Project Settings → API → Project URL + anon public key (store as `NEXT_PUBLIC_SUPABASE_KEY`, NOT `_ANON_KEY`)
4. **Replace supabase/config.toml placeholder domain:** change `domain = "example.clerk.accounts.dev"` to user's actual Clerk Frontend API URL (from Clerk Dashboard → API Keys → Frontend API URL). Only affects `supabase start` local dev; cloud Supabase already has Clerk added per user's earlier setup.

User's pre-existing setup (confirmed in prompt) that remains valid:
- Clerk dashboard: Supabase integration activated + Google/Apple/Email providers enabled ✓
- Supabase dashboard: Clerk added as Third Party Auth provider ✓
- `supabase/.temp/linked-project.json` present (CLI is linked) ✓

## Next Phase Readiness

**Ready for Phase 1 Plan 02 (schema + RLS) and/or Plan 03 (auth UI):**
- `lib/supabase/server.ts` exists — Plan 02 can call `supabaseServer()` from server actions
- `lib/auth.ts` exists — Plan 02/03 can call `getUserIdOrThrow()`
- `middleware.ts` at root protects routes — Plan 03's `app/(auth)/` routes will not be gated; Plan 04's `app/(app)/` will be
- Tailwind tokens live in `@theme` — Plan 03 can use `bg-bg-card`, `border-ink`, `shadow-[4px_4px_0_var(--ink)]`, etc.
- `TreeStoreProvider` already wrapped in root layout — Phase 2 extends `TreeState` and adds slices without changing layout.tsx

**Blockers for downstream plans (none critical, all are user-setup):**
- `.env.local` must be filled in before `npm run dev` boots (see User Setup Required above)
- `supabase/config.toml` Clerk domain is still a placeholder — only matters if/when Plan 02 uses `supabase start` for local dev instead of cloud Supabase

**Phase 2+ awareness:**
- When Plan 02 generates `lib/supabase/types.ts` via `supabase gen types typescript --local`, update `createClient(...)` to `createClient<Database>(...)` in both factory files for end-to-end RLS type safety.
- Phase 2 planners must respect the `TreeStoreProvider` + `useRef` pattern — never refactor to a module-scoped `export const store = create(...)`. CLAUDE.md + this plan's acceptance criteria both forbid it (SSR state leak).

## Self-Check: PASSED

File existence:
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/package.json` FOUND
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/middleware.ts` FOUND
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/supabase/server.ts` FOUND
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/supabase/browser.ts` FOUND
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/auth.ts` FOUND
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/utils/cn.ts` FOUND
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/store/tree-store.ts` FOUND
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/globals.css` FOUND
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/layout.tsx` FOUND

Commit existence (verified via `git log --oneline -6`):
- 2b7e54e FOUND (Task 1)
- 73f0e3f FOUND (Task 2)
- 81abb33 FOUND (Task 3)
- bd77062 FOUND (Task 4)

Verification gates (all PASSED):
- `npx tsc --noEmit` — clean, 0 errors
- `npm run build` — Compiled successfully in 3.8s (Turbopack)
- `grep "auth.uid()"` in middleware/lib/app → 0 matches
- `grep "@supabase/ssr"` in package.json + lib/ → 0 matches
- `grep "@supabase/auth-helpers-nextjs"` in package.json → 0 matches
- `grep "export const store = create"` in lib/store/ → 0 matches
- `grep "TreeStoreProvider"` in app/layout.tsx → FOUND
- `grep "weight: ['400', '600']"` in app/layout.tsx → FOUND

---
*Phase: 01-foundation*
*Completed: 2026-04-21*
