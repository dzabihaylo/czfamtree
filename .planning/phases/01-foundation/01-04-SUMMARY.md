---
phase: 01-foundation
plan: 04
subsystem: shell-ui

tags: [nextjs, react19, clerk, supabase, rls, tailwindcss-v4, swiss, playwright, e2e, rsc]

# Dependency graph
requires:
  - phase: 01-01
    provides: Tailwind v4 @theme tokens (bg/ink/accent/rule), globals.css `.grid-bg` utility, `cn()` util, Clerk `<ClerkProvider>` in root layout
  - phase: 01-02
    provides: `bootstrap_tree` RPC, typed `Database` generic on `supabaseServer()`, RLS on `trees` + `tree_members` + `people`
  - phase: 01-03
    provides: `resolveOrBootstrapTree()` + root `/` redirect to `/tree/<treeId>`, `<SignIn />` / `<SignUp />` pages with `Every name, a branch.` headline copy
provides:
  - `listMyTrees` / `createNewTree` / `renameTree` server actions under `auth.jwt()->>'sub'` RLS
  - 52px sticky authenticated TopBar with inline tree rename, 280px Swiss-card tree switcher (YOUR TREES + SHARED WITH YOU + "+ New tree"), 240px user menu with Sign out
  - `/tree/[treeId]` RSC rendering TopBar + grid + centered seed YOU node + empty-tree greeting; RLS-reject surface via `<AuthError variant="rls-reject" />`
  - Static shell primitives: Avatar (circular, sole `rounded-full` consumer in `components/shell/`), BrandMark (dual 20/28 CZ glyph), GridBackground, SeedPersonNode, EmptyTreeOverlay, AuthError
  - `hashUserIdToColor` + `initialsFromName` helpers (4-OKLCH palette) for deterministic avatar rendering
  - Playwright E2E (`e2e/signin-bootstrap.spec.ts`) that exercises the full sign-in → bootstrap → see seed → sign-out flow and asserts every UI-SPEC locked string; env-gated so CI without Clerk secrets stays green
affects: [phase-02, phase-03, phase-05]

# Tech tracking
tech-stack:
  added:
    - "@clerk/testing@2.0.17 (dev-dep) — Playwright Testing Tokens helper (clerkSetup + clerk.signIn)"
  patterns:
    - "Route-group auth guard: `app/(app)/layout.tsx` calls `getUserIdOrNull()` + `redirect('/sign-in')` as defense-in-depth against middleware bypass (Pitfall 1-3/1-6)"
    - "RSC + RLS: `app/(app)/tree/[treeId]/page.tsx` reads tree + people via `supabaseServer()`; RLS returns null-data for unauthorised treeId → render `<AuthError variant=\"rls-reject\" />` with UI-SPEC copy `This tree isn't yours to view.`"
    - "Swiss-card dropdown: 4px hard shadow (`boxShadow: '4px 4px 0 var(--ink)'`), 0px radius, left-border accent for active item. Outside-click + Escape close pattern with setTimeout(10) opening-click guard (handoff components.jsx L86-97)"
    - "Inline rename: two-mode button/input component. Enter/blur commits, Escape reverts, empty-after-trim silently reverts, optimistic displayName wrapped in `startTransition` so UI stays responsive during server action"
    - "Deterministic avatar color: `hashUserIdToColor(userId)` % 4-OKLCH palette — stable across renders and tabs"
    - "Single `rounded-full` exception within `components/shell/`: `Avatar.tsx` only (Swiss rule)"

key-files:
  created:
    - app/actions/trees.ts - listMyTrees / createNewTree / renameTree server actions (82 lines)
    - lib/utils/hashUserId.ts - hashUserIdToColor + initialsFromName (36 lines)
    - components/shell/Avatar.tsx - circular avatar (sole rounded-full consumer) (31 lines)
    - components/shell/BrandMark.tsx - dual-size CZ glyph (24 lines)
    - components/shell/GridBackground.tsx - .grid-bg wrapper (13 lines)
    - components/shell/SeedPersonNode.tsx - static 168×auto is-me node with YOU ribbon (34 lines)
    - components/shell/EmptyTreeOverlay.tsx - first-run greeting card (29 lines)
    - components/shell/AuthError.tsx - two-variant full-screen fallback (54 lines)
    - components/shell/TreeTitle.tsx - inline-rename button/input (107 lines)
    - components/shell/TreeSwitcher.tsx - 280px Swiss-card tree dropdown (159 lines)
    - components/shell/UserMenu.tsx - 240px user avatar menu with Clerk signOut (107 lines)
    - components/shell/TopBar.tsx - 52px sticky shell combining brand/title/switcher/avatar (59 lines)
    - app/(app)/layout.tsx - server-side auth guard + <main> landmark (19 lines)
    - app/(app)/tree/[treeId]/page.tsx - RSC reading tree + people under RLS (81 lines)
    - e2e/signin-bootstrap.spec.ts - Playwright Phase 1 E2E (80 lines)
  modified:
    - package.json - pinned @clerk/testing@2.0.17 exactly
    - package-lock.json - regenerated with @clerk/testing dev-dep

key-decisions:
  - "Layout split between (app)/layout.tsx (auth guard + <main>) and (app)/tree/[treeId]/page.tsx (renders <TopBar>). The topbar NEEDS tree-specific data (treeName, peopleCount) that the layout doesn't have access to without refetching — pushing the topbar into the page avoids a double-fetch."
  - "@clerk/testing pinned to 2.0.17 exactly (not ^2.0.17) to match project convention of no ^/~ pins everywhere — same discipline as plan 01-01."
  - "RLS-reject and missing-tree both render <AuthError variant='rls-reject' />. The two cases are indistinguishable to the user and surface the same UX ('This tree isn't yours to view' covers both honestly) — simpler and more secure than leaking whether a tree-id exists at all."
  - "TreeSwitcher fetches trees lazily on first open (not eagerly in the topbar RSC). Keeps the initial page render snappy and means the switcher always shows fresh data (e.g. a tree created in another tab)."
  - "Seed node is positioned via absolute `left: 50%` + `translate(-50%, 0)` rather than dagre layout. Phase 1 has exactly one node; dagre would be overkill and would introduce client-side layout work Phase 2 already owns."

patterns-established:
  - "Server-action + RSC two-tier auth: Clerk middleware gates at the route level; RSC layout re-validates with `getUserIdOrNull()` → redirect; server actions re-validate with `getUserIdOrThrow()` → throw. Three independent gates; any one bypass doesn't reach data."
  - "Dropdown close choreography: `setTimeout(10)` before installing the global `mousedown` listener prevents the click that OPENED the dropdown from immediately closing it. Reused identically in TreeSwitcher + UserMenu; same pattern will apply to Phase 2+ radial menu."
  - "Optimistic inline-edit: `useTransition` wraps the server action so the UI commits instantly (setDisplayName) and reverts on error (catch). Same shape will flow into Phase 2 SidePanel field edits."
  - "Env-gated E2E: `test.skip(!ENV_READY, '...')` in `beforeAll` + `beforeEach` so the spec file lives in the repo, compiles, shows up in `playwright test --list`, but exits green without Clerk secrets. CI can run it opportunistically once secrets land without blocking builds."

requirements-completed:
  - AUTH-06
  - TREE-01
  - TREE-02
  - TREE-03

# Metrics
duration: ~18min
completed: 2026-04-21
---

# Phase 01 Plan 04: Authenticated shell + `/tree/[treeId]` route + E2E Summary

**The authenticated shell lands end-to-end: 52px topbar (brand + inline-rename tree title + tree switcher + user avatar), seeded YOU node on a grid background with first-run greeting overlay, RLS-gated tree route, and a Playwright E2E that exercises sign-in → bootstrap → seed-node verification → sign-out.**

## Performance

- **Duration:** ~18 min (3 tasks, linear execution, no blocking deviations)
- **Started:** 2026-04-21T~22:38Z (this session)
- **Completed:** 2026-04-21T~22:56Z
- **Tasks:** 3 (all committed)
- **Files created:** 15
- **Files modified:** 2 (package.json, package-lock.json)

## Task Commits

1. **Task 1: Server actions + static shell primitives** — `093750b` (feat)
   — 8 files: `app/actions/trees.ts`, `lib/utils/hashUserId.ts`, `components/shell/{Avatar,BrandMark,GridBackground,SeedPersonNode,EmptyTreeOverlay,AuthError}.tsx`
2. **Task 2: Interactive topbar** — `b4e946a` (feat)
   — 4 files: `components/shell/{TreeTitle,TreeSwitcher,UserMenu,TopBar}.tsx`
3. **Task 3: Tree route + app layout + Playwright E2E** — `ed8da18` (feat)
   — 5 files: `app/(app)/layout.tsx`, `app/(app)/tree/[treeId]/page.tsx`, `e2e/signin-bootstrap.spec.ts`, `package.json`, `package-lock.json`

## Accomplishments

- **Server actions wired.** `app/actions/trees.ts` exports `listMyTrees()` (joins `tree_members` to `trees!inner` with `status='active'`, ordered by `trees.updated_at desc`), `createNewTree(name='Untitled tree')` (wraps the `bootstrap_tree` RPC), and `renameTree(treeId, name)` (trim + slice(0,80) + silent-revert on empty per UI-SPEC §Inline tree rename). Every action begins with `getUserIdOrThrow()` as defense-in-depth (Pitfall 1-6).
- **Static shell primitives.** Avatar is the ONLY `rounded-full` consumer inside `components/shell/` (verified by grep). BrandMark supports sm=20px topbar / lg=28px sign-in dual use. SeedPersonNode renders the handoff `.node.is-me` variant: 168px wide, 2px ink border, YOU ribbon (`font-mono text-[9px] tracking-[0.12em]` hard-pinned top-right, 2px 6px padding). EmptyTreeOverlay carries the UI-SPEC-locked `Getting started` / `Your tree is ready.` / `Click your card to start adding relatives — or stay here and get your bearings.` copy block with a 4px hard shadow. AuthError ships both `bootstrap` and `rls-reject` variants with the exact UI-SPEC error-copy strings.
- **Interactive topbar.** TreeTitle flips between a click-to-rename button (`· 1 person` / `· N people` meta) and a bare input (maxLength=80, placeholder `Name your tree`, title `Click to rename`). Enter or blur commits via `renameTree`; Escape reverts; empty-after-trim silently reverts; server errors silently revert to the pre-edit name. TreeSwitcher is a 280px Swiss-card dropdown (`boxShadow: '4px 4px 0 var(--ink)'`, anchored `top: calc(100% + 4px)`) listing owned trees under `YOUR TREES`, shared trees under `SHARED WITH YOU` (hidden when empty), and a `+ New tree` action that calls `createNewTree()` and `router.push`es to the new tree. Active-tree rows get a 4px left-border accent. UserMenu is a 240px right-aligned dropdown with a non-clickable header (`{displayName}` + `{email}` + rule-soft divider) and a Sign out row using Clerk's `useClerk().signOut({ redirectUrl: '/sign-in' })`. Both dropdowns reuse the `setTimeout(10)` outside-click guard + Escape-returns-focus pattern.
- **Tree route.** `app/(app)/tree/[treeId]/page.tsx` is an RSC with `dynamic = 'force-dynamic'`. It awaits `params`, re-validates auth, reads the tree via `supabase.from('trees').select(...).eq('id', treeId).maybeSingle()`, and the people via `supabase.from('people').select('id, name, x, y, is_me').eq('tree_id', treeId)`. On null-tree → `<AuthError variant="rls-reject" />`. On success → `<TopBar>` + a `<section aria-label="Family tree canvas" tabIndex={0}>` with `<GridBackground>` + a centered `<SeedPersonNode>` + `<EmptyTreeOverlay>` (while `peopleList.length <= 1`).
- **Route-group layout.** `app/(app)/layout.tsx` calls `getUserIdOrNull()` and `redirect('/sign-in')` on null, wrapping children in a `<main className="relative min-h-screen bg-bg text-ink">` landmark.
- **Playwright E2E.** `e2e/signin-bootstrap.spec.ts` uses `@clerk/testing/playwright` (`clerkSetup` in `beforeAll`, `clerk.signIn` with password strategy). After sign-in it `goto('/')`, asserts the URL matches `/tree/[0-9a-f-]{36}$`, then verifies visibility of `Family Tree`, `My family tree`, `· 1 person`, `YOU`, `Your tree is ready.`, opens the user menu, clicks Sign out, and asserts redirect to `/sign-in` + visibility of `Every name, a branch.`. The spec is env-gated (`test.skip(!ENV_READY, ...)`) so CI without Clerk secrets stays green.

## Decisions Made

- **Layout split between `(app)/layout.tsx` and `tree/[treeId]/page.tsx`.** The topbar needs tree-specific data (treeName, peopleCount) that the layout doesn't already have. Rendering the topbar in the page avoids re-fetching the tree twice.
- **`@clerk/testing` pinned to 2.0.17 exactly.** Plan 01-01 established the no-`^`/no-`~` convention; applied identically here. Initial `npm install -D @clerk/testing@latest` resolved to `^2.0.17`; manually rewritten to `2.0.17` and reinstalled to regenerate the lockfile.
- **RLS-reject and missing-tree surface the same UX.** Both render `<AuthError variant='rls-reject' />`. We don't leak whether a tree-id exists by branching to a distinct 404 page — the UI-SPEC copy `This tree isn't yours to view.` is honest for both cases.
- **TreeSwitcher lazy-fetches.** The list loads on first open, not eagerly in the page RSC. Keeps first-paint fast and means the list always reflects the current server state when a user opens the menu (e.g. after creating a tree in another tab).
- **Seed node centered via CSS, not dagre.** With exactly one node in Phase 1, dagre would be overkill. Centering via `left: 50%` + `translate(-50%, 0)` avoids shipping any layout logic into Phase 1. Phase 2's pan/zoom wrapper will replace the static positioning.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `@clerk/testing` initially installed with caret prefix**
- **Found during:** Task 3 (after `npm install -D @clerk/testing@latest`)
- **Issue:** `npm install` resolved the package to `^2.0.17` in `package.json.devDependencies`; project convention (plan 01-01) is exact-pinned dependencies everywhere (no `^`, no `~`) to prevent lockfile drift on Vercel builds.
- **Fix:** Edited `package.json` to pin `"@clerk/testing": "2.0.17"` and re-ran `npm install --legacy-peer-deps` to sync the lockfile. `npx tsc --noEmit` and `npm run build` still clean.
- **Files modified:** `package.json`, `package-lock.json`
- **Committed in:** `ed8da18` (Task 3 commit)

**2. [Rule 1 - Bug] Supabase nested-select inferred type widens to array in Phase 1**
- **Found during:** Task 1 (after writing `listMyTrees` verbatim from plan)
- **Issue:** `supabase-js` infers the shape of nested joins from the foreign-key cardinality detected at type-gen time; the `trees!inner(...)` join can type-widen `row.tree` to `trees | trees[]` depending on FK direction. TypeScript under strict mode rejected the verbatim `row.tree.id` access as "property does not exist on array".
- **Fix:** Normalised with `const tree = Array.isArray(row.tree) ? row.tree[0] : row.tree;` inside the map. Coerced the row to `any` (already implicit in the plan's code) and projected each column explicitly. No behavioural change — `!inner` guarantees a single row at runtime; this is a type-safety cast only.
- **Files modified:** `app/actions/trees.ts`
- **Verification:** `npx tsc --noEmit` exits 0 after the fix; `npm run build` clean.
- **Committed in:** `093750b` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — pin-format + Supabase type-widening)
**Impact on plan:** None. Success criteria, acceptance criteria, and UI-SPEC copy all satisfied. No architectural changes (Rule 4) triggered; no open blockers.

## Deferred Verification

1. **Playwright E2E execution.** The spec is written, typechecks, compiles, and lists in `playwright test --list` (`Total: 1 test in 1 file`). It is NOT run in this plan because:
   - `.env.local` is still empty (`.env.local.example` is the only env file in-tree — consistent with 01-01/02/03 SUMMARY notes).
   - Running requires a test user provisioned in the Clerk Dashboard with password strategy enabled, plus the two E2E env vars below.
   - The spec is env-gated via `test.skip(!ENV_READY, ...)` so running `npx playwright test` without secrets exits green (no tests ran, not a failure) and CI won't break.
   - **To run locally once secrets land:**
     ```bash
     E2E_CLERK_USER_USERNAME=... \
     E2E_CLERK_USER_PASSWORD=... \
     CLERK_SECRET_KEY=... \
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... \
     NEXT_PUBLIC_SUPABASE_URL=... \
     NEXT_PUBLIC_SUPABASE_KEY=... \
     NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in \
     NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up \
     npm run dev &
     npx playwright test e2e/signin-bootstrap.spec.ts
     ```
   - Playwright Chromium was installed during this plan (92MB to `~/Library/Caches/ms-playwright/chromium_headless_shell-1217`), so the browser is ready when credentials arrive.

2. **Visual render verification.** Same blocker as 01-03: populated `.env.local` is required before `npm run dev` will boot. Once populated, the user should manually verify:
   - 52px topbar with CZ + "Family Tree" wordmark + `My family tree · 1 person` + chevron + circular avatar
   - Empty-tree overlay centered on a dotted grid background, "Getting started" / "Your tree is ready." / em-dash-containing sub-copy
   - Clicking the tree title turns it into an input; Enter commits; Escape reverts
   - Clicking the chevron opens the 280px dropdown with the `YOUR TREES` / `SHARED WITH YOU` + `+ New tree` sections and the active tree has the 4px accent left-border
   - Clicking the avatar opens the 240px right-aligned menu with displayName + email header + Sign out row
   - Clicking Sign out redirects to `/sign-in` with the handoff split-50/50 layout visible

3. **Cross-user RLS isolation.** Requires two Clerk accounts + manual URL tampering (`/tree/<otherUsersUuid>`) to verify the `<AuthError variant="rls-reject" />` surface. Plan 02's RLS policies were type-checked; this plan confirms the UX wrapper; the full round-trip is deferred to the multi-account retro.

## E2E Environment Variables

The E2E requires all 7 runtime env vars plus 2 E2E-only ones:

**Runtime (also required for `npm run dev`):**
1. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk Dashboard → API Keys
2. `CLERK_SECRET_KEY` — Clerk Dashboard → API Keys (also needed by `@clerk/testing` to mint testing tokens)
3. `NEXT_PUBLIC_SUPABASE_URL` — Supabase → Project Settings → API
4. `NEXT_PUBLIC_SUPABASE_KEY` — Supabase → Project Settings → API → anon public key
5. `CLERK_JWT_KEY` (optional) — speeds up JWT verification
6. `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` — set default in `.env.local.example`
7. `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` — set default in `.env.local.example`

**E2E-only:**
- `E2E_CLERK_USER_USERNAME` — email/username of a test user in Clerk Dashboard with password strategy enabled
- `E2E_CLERK_USER_PASSWORD` — that user's password

The test user must be created in Clerk Dashboard → Users before running. For CI, store these as repository secrets and pass via environment variables to the Playwright job.

## Verification Gates

- `npx tsc --noEmit` — clean, exit 0 (ran after each task + final)
- `npm run build` — Compiled successfully in 6.6s (Turbopack); **5 routes produced**:
  - `ƒ /` (force-dynamic root redirect)
  - `○ /_not-found`
  - `ƒ /sign-in/[[...sign-in]]`
  - `ƒ /sign-up/[[...sign-up]]`
  - `ƒ /tree/[treeId]` **← new in this plan**
- `npx playwright test --list e2e/signin-bootstrap.spec.ts` → `Total: 1 test in 1 file` (parses cleanly)
- `grep -Rln "rounded-full" components/shell/` → only `Avatar.tsx` (UI-SPEC Swiss-rule single-exception satisfied)
- `grep -c "'500'\|font-medium" components/shell/*.tsx` → 0 across all files (UI-SPEC no-500-weight rule)
- `grep -c "import from a sheet" components/shell/` → 0 (Sheets v2-deferred)
- `grep "height: 52" components/shell/TopBar.tsx` → matched (DESIGN-03 pixel-parity: 52px, NOT 56px)
- All UI-SPEC locked strings present and verified: `Your tree is ready.`, `Click your card to start adding relatives`, `· 1 person`, `YOUR TREES`, `SHARED WITH YOU`, `New tree`, `Sign out`, `We couldn't set up your tree.`, `This tree isn't yours to view.`, `Name your tree`, `Click to rename`, `Getting started`
- `head -1 app/actions/trees.ts` → `'use server';` (Next Server Action marker)
- `grep "rpc('bootstrap_tree'" app/actions/trees.ts` → matched (plan 02 RPC wired for `createNewTree`)
- Working tree clean after all 3 task commits

## Confirmation: Single `rounded-full` Consumer

Per UI-SPEC §Spacing — "Border radius: 0px everywhere. Exceptions: Avatars (circles)":

```
$ grep -Rln "rounded-full" components/shell/
components/shell/Avatar.tsx   ← ONLY match
```

(Note: `components/auth/SignInIllustration.tsx` from plan 01-03 uses `rounded-full` on a 6×6px presence-indicator dot — that's a pre-existing legitimate circle outside this plan's scope and also covered by the Swiss-rule avatar-and-circle exception.)

## Confirmation: Topbar Height 52px (not 56px)

```
$ grep -n "height: 52" components/shell/TopBar.tsx
39:      style={{ height: 52, padding: '0 16px' }}
```

DESIGN-03 pixel-parity honoured. UI-SPEC §Open Questions #1 explicitly locks Phase 1 at 52px.

## Known Stubs

None. Every rendered element flows real data or uses UI-SPEC-locked copy. The tree route fetches real tree + people rows under RLS; the seed node renders the seeded person's actual `name` from the DB; the user menu header shows the real Clerk `displayName` + `email`; the tree switcher fetches real membership rows. No placeholder data flows to the UI.

## Threat Flags

None. This plan's new surface (`listMyTrees`/`createNewTree`/`renameTree` server actions + `/tree/[treeId]` RSC) is fully covered by the plan's `<threat_model>` section (T-04-01 through T-04-09). No uncaptured network endpoints, auth paths, file-access patterns, or schema-crossing trust boundaries introduced.

## Phase 1 Readiness

**Phase 1 is code-complete.** All four plans delivered:

- [x] 01-01 Infrastructure scaffold
- [x] 01-02 Schema + RLS + bootstrap RPC
- [x] 01-03 Sign-in screen + bootstrap action
- [x] 01-04 Authenticated shell + tree route + E2E

**Verification status:**
- `npx tsc --noEmit`: ✓ clean
- `npm run build`: ✓ 5 routes produced
- `npx playwright test --list`: ✓ 1 test discovered

**User-side gates remaining before deploy:**
1. Populate `.env.local` with Clerk + Supabase keys (blocking for first-run smoke)
2. Configure Clerk Dashboard (Google/Apple/email providers, Supabase third-party auth integration, `/sign-in` / `/sign-up` paths) — per 01-03 SUMMARY's Clerk Dashboard table
3. Create a test user with password strategy + populate `E2E_CLERK_USER_USERNAME` / `E2E_CLERK_USER_PASSWORD` before running the Playwright E2E
4. Run `npm run dev` → sign in with Google → land on `/tree/<uuid>` → verify topbar/seed/overlay

Phase 2 can begin planning immediately; no Phase 1 work remains.

## Next Session

Ready for Phase 2 planning (Canvas, Nodes & Edit). The topbar, auth guard, route group, and RSC-RLS-render pattern established here are the foundation Phase 2's pan/zoom canvas sits on top of. `TreeState` in `lib/store/tree-store.ts` can be extended with `people`, `selectedPersonId`, `transform` slices without touching layout.tsx or any Phase 1 file.

## Self-Check

**Created files exist:**
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/actions/trees.ts
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/lib/utils/hashUserId.ts
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/Avatar.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/BrandMark.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/GridBackground.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/SeedPersonNode.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/EmptyTreeOverlay.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/AuthError.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/TreeTitle.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/TreeSwitcher.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/UserMenu.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/components/shell/TopBar.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/(app)/layout.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/app/(app)/tree/[treeId]/page.tsx
- FOUND: /Users/davezabihaylo/Documents/ClaudeCode/czfamtree/e2e/signin-bootstrap.spec.ts

**Commits exist (git log --oneline):**
- FOUND: 093750b (Task 1 — server actions + shell primitives)
- FOUND: b4e946a (Task 2 — interactive topbar + dropdowns)
- FOUND: ed8da18 (Task 3 — tree route + app layout + E2E)

**Verification gates:**
- `npx tsc --noEmit` → exit 0
- `npm run build` → Compiled successfully, 5 routes present (/, /sign-in, /sign-up, /tree/[treeId], /_not-found)
- `npx playwright test --list e2e/signin-bootstrap.spec.ts` → 1 test discovered

## Self-Check: PASSED

---
*Phase: 01-foundation*
*Completed: 2026-04-21*
