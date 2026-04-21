# Phase 1: Foundation — Research

**Researched:** 2026-04-21
**Domain:** Auth (Clerk 7) + Postgres schema + RLS (Supabase) + first-run tree bootstrap + sign-in UI
**Confidence:** HIGH

## Summary

Phase 1 is the single most trust-critical phase in the roadmap — schema, RLS, and auth mistakes are measured in post-launch data-migration pain, not in rework hours. The good news is that every decision required is already scoped by CLAUDE.md, PROJECT.md, and the upstream research (STACK.md, ARCHITECTURE.md, PITFALLS.md). This document consolidates the prescriptive answers and resolves the nine critical open questions posed by the orchestrator.

The biggest planning decision — step-relations data model — resolves to **accept the `parent_ids uuid[]` array (max 2) for v1, with a documented workaround (step-parents as additional spouse link + notes), and migrate to a `relationships` table in v2 only if user research confirms demand**. The rationale is at §3.

The second-biggest — Clerk 7 ↔ Supabase wiring — has a verified, current (2026) pattern confirmed against the official Clerk reference repo (`github.com/clerk/clerk-supabase-nextjs`). Key fact: **use `@supabase/supabase-js` `createClient()` with the `accessToken` option; do NOT use the deprecated JWT template; do NOT use `@supabase/auth-helpers-nextjs`**. Env vars are `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_KEY` (publishable/anon key; Clerk's reference repo uses `_KEY` suffix, NOT `_ANON_KEY` or `_PUBLISHABLE_KEY` — the naming is confusable; see §2).

The remaining seven decisions — RLS patterns, first-login bootstrap, tree switcher query, migrations strategy, Clerk `<SignIn />` appearance overrides, Phase-1-only pitfalls, and Vercel deploy baseline — all have prescriptive answers below.

**Primary recommendation:** Start with `npx create-next-app@latest --typescript --tailwind --app --turbopack` pinned to Next 16.2.4, install the exact dependency set from §4, run the Supabase CLI to scaffold `supabase/migrations/20260421000000_initial_schema.sql` (per §9), add Clerk as a third-party auth provider in the Supabase dashboard + Clerk dashboard, wire the `clerkMiddleware()` from §2, and build the sign-in UI (§11) before touching any schema code.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sign-in UI (Google/Apple/email) | Browser / Client | Frontend Server (SSR) | Clerk hosted `<SignIn />` is a React client component; SSR layout wraps it in `<ClerkProvider>` for session hydration |
| Session management | Browser (cookie) | API / Backend | Clerk sets httpOnly `__session` cookie from OAuth callback; server reads via `auth()` in RSC/actions |
| Route protection | Frontend Server (middleware) | API / Backend | `clerkMiddleware()` runs before RSC; server actions re-check `auth()` as defense in depth |
| Tree data fetch (initial paint) | Frontend Server (RSC) | Database | RSC with server Supabase client + Clerk token; RLS enforces access |
| Tree creation / rename | API / Backend (Server Action) | Database | Server actions are the authoritative write path; RLS enforces ownership |
| Tree switcher query | API / Backend (Server Action) | Database | Runs in the topbar loader; reads `trees` + `tree_members` via RLS-scoped query |
| Seed "You" node creation | API / Backend (Server Action, idempotent) | Database | On first authenticated load, server action creates tree + seed person atomically |
| RLS enforcement | Database | — | Postgres policies evaluated against `auth.jwt()->>'sub'` injected by Supabase JWT verification |
| Sign out | Browser / Client | — | Clerk `signOut()` clears session cookie; redirects to `/sign-in` |

**Why this matters for Phase 1:** There is no canvas tier yet. Everything in this phase is auth + schema + one minimal authenticated route. Keep the planner honest: drag/pan/zoom/SVG belong to Phase 2.

## User Constraints (from CLAUDE.md)

> No CONTEXT.md exists for Phase 1 at the time of research. Constraints below are extracted from CLAUDE.md (project-level) and the orchestrator's pre-decided stack, which function as locked decisions for this phase.

### Locked Decisions (from CLAUDE.md + orchestrator)

- **Framework:** Next.js 16.2.4 (App Router) + React 19.2.5 + TypeScript 6.0.3 + Tailwind v4.2.4
- **Auth:** Clerk 7.2.3 (`@clerk/nextjs`) with Supabase native third-party auth integration — NOT the deprecated JWT template (deprecated 2025-04-01)
- **DB:** Supabase Postgres with RLS + Realtime; `@supabase/supabase-js` 2.104.0 (NOT `@supabase/ssr` for the core client — see §2 for nuance); `@supabase/ssr` 0.10.2 only if cookie-based session storage is needed (it is NOT, because Clerk owns the cookie)
- **Clerk userId is TEXT:** RLS policies use `auth.jwt()->>'sub'` (Clerk sub is a string `user_2abcXYZ`, not a UUID). `auth.uid()` DOES NOT WORK with Clerk-issued JWTs
- **Relationships as arrays:** `people.parent_ids uuid[]`, `spouse_ids uuid[]`, `child_ids uuid[]` with GIN indexes — NOT a join table (pending explicit Phase 1 decision to keep, per §3)
- **Deployment:** Vercel, Next ≥ 16 (closes CVE-2025-29927)
- **Zustand 5 + zundo 2 + immer 11** scaffolding lands in Phase 1 (store factory + Provider pattern), but canvas state (pan/zoom, selection, radial) is Phase 2
- **Testing:** Vitest 4.1.5 (unit for `model.ts`) + Playwright 1.59.1 (E2E) — scaffolded in Phase 1, real coverage starts in Phase 2

### Claude's Discretion

- Migration file naming & structure (§9)
- First-run bootstrap flow — server action vs client upsert (§6)
- Tree switcher query shape — inline vs view vs RPC (§7)
- Clerk `<SignIn />` styling approach — `appearance.variables` + `appearance.elements` breakdown (§11)
- Exact Zustand store shape for tree-level state (tree id, name, members list) — Phase 2 will extend it; keep minimal in Phase 1

### Deferred Ideas (OUT OF SCOPE for Phase 1)

- Canvas pan/zoom, SVG edges, PersonNode rendering, selection, side panel → Phase 2
- Radial add menu, collision nudge, undo/redo, toolbar, toasts, search, a11y sweep → Phase 3
- Dagre Tidy layout → Phase 4
- Share modal, tree_members role management, Realtime presence + cursors + broadcast, email invite delivery → Phase 5
- Photo upload, right-click context menu, GEDCOM, Sheets sync → v2
- Private/public Realtime channel authorization (`realtime.messages` RLS policies) → Phase 5

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Sign in with Google via Clerk | §2 (Clerk setup), §11 (SignIn appearance) |
| AUTH-02 | Sign in with Apple via Clerk | §2, §11 |
| AUTH-03 | Sign in with email (magic link or code) via Clerk | §2, §11 |
| AUTH-04 | Sign-in screen pixel-parity with handoff | §11 (appearance API tradeoffs) |
| AUTH-05 | Session persists across browser refresh | §2 (Clerk httpOnly cookie behaviour) |
| AUTH-06 | Sign out from user menu | §11 (UserMenu pattern with `signOut()`) |
| TREE-01 | First sign-in auto-creates tree with seed "You" node | §6 (bootstrap flow) |
| TREE-02 | User can create a new tree and rename inline | §7, §11 (inline rename UX) |
| TREE-03 | User can switch between owned/invited trees | §7 (tree switcher query) |
| TREE-04 | Tree private to owner + invited members (RLS via `auth.jwt()->>'sub'`) | §5 (RLS policies) |
| DATA-01 | `people` table schema | §4 (schema) |
| DATA-02 | `trees` table schema | §4 |
| DATA-03 | `tree_members` table schema | §4 |
| DATA-04 | `invites` table schema | §4 |
| DATA-05 | RLS via `SECURITY DEFINER` helper `user_tree_ids(uid text)` | §5 (recursion avoidance) |
| DATA-06 | `parent_ids` constrained to max 2; CHECK rejects self-parent | §3 (step-relations decision), §4 (CHECK constraints) |
| DATA-07 | Server-side cycle detection on relationship mutation | §4 (cycle detection function) |
| DATA-08 | GIN indexes on `spouse_ids`, `parent_ids`, `child_ids` | §4 (indexes) |
| DATA-09 | Unique partial index enforcing one `is_me=true` person per tree per user | §4 (indexes) |
| DATA-10 | `people.id` is client-generated UUID | §6 (uid() + nanoid, DEFAULT gen_random_uuid() as fallback) |
| DESIGN-03 | Tailwind v4 `@theme` maps handoff `:root` CSS variables 1:1 | §10 (Tailwind v4 config) |
| DEP-02 | Next.js ≥ 16 (closes CVE-2025-29927, matches Clerk 7) | §12 (deploy baseline) |

---

## §1. Standard Stack (Phase 1 scope)

### Core (required for Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.4 | App Router framework [VERIFIED: npm view next version → 16.2.4 on 2026-04-21] | Required by Clerk 7; closes CVE-2025-29927; Turbopack default in dev+build |
| react | 19.2.5 | UI runtime | Required by Next 16 [CITED: github.com/vercel/next.js upgrade guide] |
| react-dom | 19.2.5 | DOM renderer | Pairs with react 19 |
| typescript | 6.0.3 | Type safety | TS 6 has isolatedDeclarations; stable for Next 16 |
| @clerk/nextjs | 7.2.3 | Auth (Google, Apple, email) [VERIFIED: npm view → 7.2.3] | Core 3; required for Next 16 compat |
| @supabase/supabase-js | 2.104.0 | Postgres REST + Realtime client [VERIFIED: npm view → 2.104.0] | Accepts `accessToken` async option for Clerk JWT injection |
| tailwindcss | 4.2.4 | Utility styling [VERIFIED: npm view → 4.2.4] | CSS-first `@theme` for handoff tokens |
| @tailwindcss/postcss | 4.2.4 | PostCSS plugin | v4 requires this |

### Supporting (required for Phase 1)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.3.6 | Schema validation [VERIFIED: npm view → 4.3.6] | Share one schema between Clerk sign-up form validation, server action input, and DB insert |
| react-hook-form | 7.73.1 | Form state [VERIFIED: npm view → 7.73.1] | Tree-rename inline form in Phase 1; side panel in Phase 2 |
| @hookform/resolvers | 5.2.2 | RHF ↔ Zod glue [VERIFIED: npm view → 5.2.2] | Required because Zod v4 broke v3 resolver |
| lucide-react | 1.8.0 | Icon set | `ChevronDown`, `Plus`, `LogOut`, `Mail` per UI-SPEC §"Icons required" |
| nanoid | 5.1.9 [VERIFIED: npm view → 5.1.9, newer than CLAUDE.md's 5.1.7] | UUID-like client-side ID generation | For `people.id`, `trees.id` when we want pre-insert IDs (matches handoff's `uid()` pattern). DB `DEFAULT gen_random_uuid()` is the fallback |
| clsx | 2.1.1 | className joiner | Standard paired with tailwind-merge |
| tailwind-merge | 3.3.0 | class conflict resolver | `cn()` util |

### Development Tools (scaffolded Phase 1, used heavily Phase 2+)

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| vitest | 4.1.5 | Unit tests | Minimal smoke tests in Phase 1 (e.g., the `generateUserId()` helper); real coverage in Phase 2 |
| @vitejs/plugin-react | 5.0.4 | JSX transform for Vitest | Required for React 19 JSX |
| @testing-library/react | 17.0.2 | Component tests | React 19 compatible |
| @playwright/test | 1.59.1 | E2E canvas flows | Smoke test in Phase 1: "sign in → land on seeded tree → sign out" |
| eslint | 9.x flat config | Linting | Use `eslint-config-next@16.x` |
| prettier | 3.4.2 | Formatting | With `prettier-plugin-tailwindcss` |
| supabase CLI | 2.x | Local Postgres + migration management | `supabase init` + `supabase start` for local dev; migrations in `supabase/migrations/` |

### NOT needed in Phase 1 (deferred)

- `@supabase/ssr` — only needed if you want Supabase-Auth-SSR cookie handling. Clerk owns the auth cookie; we just inject Clerk's JWT into `createClient(...)` via `accessToken`. **Skip `@supabase/ssr` entirely** [VERIFIED: Clerk's official reference repo uses plain `@supabase/supabase-js`, not `@supabase/ssr`].
- `zustand`, `zundo`, `immer` — install the packages but do NOT wire a tree-data store yet. Phase 2 introduces `people` state; Phase 1 only has `tree` (static) and `user` (Clerk hook).
- `@dagrejs/dagre` — Phase 4 only.
- `react-hot-toast`, `date-fns` — not used in Phase 1 per UI-SPEC §"Error states".

### Installation (Phase 1 subset)

```bash
# Core
npm install next@16.2.4 react@19.2.5 react-dom@19.2.5
npm install @clerk/nextjs@7.2.3
npm install @supabase/supabase-js@2.104.0

# Forms + validation + icons
npm install react-hook-form@7.73.1 zod@4.3.6 @hookform/resolvers@5.2.2
npm install lucide-react@1.8.0
npm install nanoid@5.1.9 clsx@2.1.1 tailwind-merge@3.3.0

# Dev + testing scaffolding (Phase 1 scaffolds, Phase 2+ uses)
npm install -D typescript@6.0.3 @types/react@19 @types/node@20
npm install -D tailwindcss@4.2.4 @tailwindcss/postcss@4.2.4
npm install -D vitest@4.1.5 @vitejs/plugin-react@5.0.4 jsdom@25.0.1
npm install -D @testing-library/react@17.0.2 @testing-library/user-event@14.6.1
npm install -D @playwright/test@1.59.1
npm install -D eslint@9.28.0 eslint-config-next@16.2.4
npm install -D prettier@3.4.2 prettier-plugin-tailwindcss@0.6.11
npm install -D supabase  # CLI as devDep
```

**Version verification:** All versions above verified live via `npm view <pkg> version` on 2026-04-21 [VERIFIED].

---

## §2. Clerk 7 + Supabase native third-party auth wiring

### Source authority

[VERIFIED: Clerk's official reference repo at github.com/clerk/clerk-supabase-nextjs, inspected 2026-04-21 via raw.githubusercontent.com]
[CITED: clerk.com/docs/integrations/databases/supabase]
[CITED: supabase.com/docs/guides/auth/third-party/clerk]

### Step-by-step setup

**Step 1: Clerk dashboard** (once per env: dev, staging, prod)
1. Go to Clerk Dashboard → **Integrations** → **Supabase** → **Activate Supabase integration**.
2. This reveals your Clerk **Frontend API URL** (format: `https://your-app.clerk.accounts.dev` in dev; your custom domain in prod). Copy it.
3. Side effect: Clerk begins including the `role: 'authenticated'` claim in session JWTs, required by Supabase RLS to identify authenticated users.

**Step 2: Supabase dashboard** (once per project)
1. Go to Supabase Dashboard → **Authentication** → **Sign In / Up** → **Third Party Auth** → **Add provider** → select **Clerk**.
2. Paste the Clerk domain from Step 1.
3. Save. No shared secret, no JWT template — just trust-by-issuer via Clerk's public JWKS.

**Step 3: Local development (`supabase/config.toml`)**
```toml
[auth.third_party.clerk]
enabled = true
domain = "example.clerk.accounts.dev"   # replace with your Clerk dev domain
```
[CITED: supabase.com/docs/guides/auth/third-party/clerk — quoted verbatim]

**Step 4: Next.js middleware (`middleware.ts` at project root)**
```ts
// middleware.ts  [VERIFIED: exact code from clerk/clerk-supabase-nextjs/middleware.ts]
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

> **CZ-specific customization:** Clerk's reference repo does NOT protect any routes by default; you must add `createRouteMatcher` + `auth.protect()` for `/` (which redirects to the user's tree) and `/tree/*`. See §6 for the protection pattern.

**Step 5: Environment variables (`.env.local`)**

| Name | Example | Scope | Source |
|------|---------|-------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Public | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | `sk_test_...` | Server-only | Clerk dashboard → API Keys |
| `CLERK_JWT_KEY` | `-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----` | Server-only (optional, speeds up JWT verify) | Clerk dashboard → JWT Public Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xyz.supabase.co` | Public | Supabase dashboard → Project URL |
| `NEXT_PUBLIC_SUPABASE_KEY` | `eyJ...` | Public | Supabase dashboard → anon public key |

> **⚠️ Naming gotcha:** Clerk's reference repo uses `NEXT_PUBLIC_SUPABASE_KEY`, NOT the more common `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Pick one naming convention project-wide and document it. This research recommends `NEXT_PUBLIC_SUPABASE_KEY` to match Clerk's reference exactly and reduce friction for anyone copy-pasting from the upstream demo.

[VERIFIED: .env.local.example from clerk/clerk-supabase-nextjs repo lists exactly these 5 keys]

**Step 6: Browser/client Supabase factory (`lib/supabase/browser.ts`)**
```tsx
// lib/supabase/browser.ts
'use client';
import { useSession } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

export function useSupabaseBrowser() {
  const { session } = useSession();
  return useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_KEY!,
        {
          async accessToken() {
            return session?.getToken() ?? null;
          },
        }
      ),
    [session]
  );
}
```

> **Why `useSession` not `useAuth`:** Clerk's reference repo uses `useSession().session?.getToken()`. Both `useSession` and `useAuth` can produce a token, but the reference pattern is `useSession` — match it exactly.
[VERIFIED: clerk/clerk-supabase-nextjs/app/page.tsx]

**Step 7: Server Supabase factory (`lib/supabase/server.ts`)**
```ts
// lib/supabase/server.ts
import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken();
      },
    }
  );
}

// Helper: get the Clerk user id on the server (TEXT, not UUID)
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error('UNAUTHENTICATED');
  return userId;  // e.g. 'user_2abcXYZdef'
}
```

[CITED: clerk.com docs, verified against reference repo pattern]

**Step 8: JWT claim verification (RLS side)**

Once both dashboards are configured and the client is passing the Clerk JWT via `accessToken`, Postgres sees:
- `auth.jwt()` → the full Clerk-issued JWT as JSON
- `auth.jwt()->>'sub'` → Clerk user id as text (e.g. `'user_2abcXYZdef'`)
- `auth.role()` → `'authenticated'` (because Clerk now issues that claim)
- `auth.uid()` → **INVALID / NULL** — this function casts `sub` to UUID, which fails for Clerk ids. DO NOT USE.

[CITED: clerk.com docs quote: `using (((select auth.jwt()->>'sub') = (user_id)::text))` — the canonical RLS pattern]

### Why NOT `@supabase/ssr`

Clerk's reference repo uses bare `@supabase/supabase-js` with `createClient(...)`. It does NOT use `@supabase/ssr`'s `createServerClient`/`createBrowserClient`. Reason: `@supabase/ssr` exists to handle **Supabase Auth's** cookie-based session. Since Clerk owns the auth cookie and we're injecting its JWT via `accessToken`, there's no Supabase cookie to manage — `@supabase/ssr` adds complexity with no benefit.

> **If you see tutorials using `createServerClient` from `@supabase/ssr` with Clerk**, they're either pre-April-2025 (JWT template era) or over-engineered. Ignore them.

### Helper: typed userId getter for server actions

```ts
// lib/auth.ts
import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';

export type ClerkUserId = string & { __brand: 'ClerkUserId' };

export async function getUserIdOrNull(): Promise<ClerkUserId | null> {
  const { userId } = await auth();
  return (userId as ClerkUserId) ?? null;
}

export async function getUserIdOrThrow(): Promise<ClerkUserId> {
  const userId = await getUserIdOrNull();
  if (!userId) throw new Error('UNAUTHENTICATED');
  return userId;
}

// For rendering the user menu: display name + email + avatar
export async function getUserProfile() {
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? 'You',
    email: user.primaryEmailAddress?.emailAddress ?? '',
    avatarUrl: user.imageUrl,
  };
}
```

> **PITFALL #12 (Pitfalls Research):** Never pass the full `currentUser()` object across the Server/Client boundary — it's a class instance, not a plain object. Always project it into a plain object before passing as a prop. The helper above does this correctly.

### Validation checklist

- [ ] `middleware.ts` at project root (NOT inside `app/` or `src/`)
- [ ] `clerkMiddleware()` imported from `@clerk/nextjs/server` (NOT `@clerk/nextjs`)
- [ ] 5 env vars present in `.env.local` and Vercel project settings
- [ ] Clerk dashboard Supabase integration **Activated**
- [ ] Supabase dashboard **Third Party Auth → Clerk** added with Clerk domain
- [ ] `supabase/config.toml` has `[auth.third_party.clerk]` block for local dev
- [ ] Server component calling `auth()` returns `{ userId: 'user_xxx' }` (not null)
- [ ] Test query: `supabase.from('trees').select()` returns `[]` when unauthenticated (RLS blocks), returns owned trees when authenticated

---

## §3. Step-relations data model decision

### Decision: **KEEP arrays (v1). Defer `relationships` table to v2.**

### Rationale

The orchestrator flagged this as "the single biggest schema decision in the phase." Three options were considered:

**Option A — Keep `parent_ids uuid[]` max 2 (CHOSEN)**
- **Pros:** Matches PROJECT.md key decisions, matches handoff TS contract, simpler reads (one row per person), GIN-indexable, zero migration cost for v1
- **Cons:** Cannot represent (a) step-parents as distinct from biological, (b) adoptive parent alongside 2 biological, (c) >2 legal parents (polyamorous triads, co-parents with donor known), (d) lineage type metadata
- **v1 workaround for step-parents:** Two paths:
  1. **Model step-parent as a spouse of biological parent** — user adds stepfather as Mom's current spouse. Child does NOT get stepfather in `parent_ids`. Relationship visible on canvas via spouse edge; notes field captures "raised me" narrative.
  2. **Document the limitation in UI empty state** — e.g., when user searches "how do I add a step-parent?", surface a help note. Accept that some users will shoehorn the data.

**Option B — Promote to `relationships(tree_id, a_id, b_id, kind, lineage_type)` table (REJECTED for v1)**
- **Pros:** Expressive; supports v2 features (lineage type, time-bounded marriages, step/adopt distinction) natively; clean FK integrity
- **Cons:** Schema mismatch with handoff's `Person` type — requires a translation layer in `computeEdges` and every mutation; forces RLS to check membership on yet another table (adds the recursion risk from PITFALL #6); add-relative flow becomes a two-row transaction (insert person + insert relationship) instead of a three-patch array update; client-side state shape changes; Phase 2/3 plans must be rewritten
- **v1 fit:** Over-engineering. Core Value is "canvas + radial-add loop feels effortless" — not "captures every family configuration accurately"

**Option C — Hybrid (arrays + separate `step_relationships` table) (REJECTED)**
- **Pros:** Could add step-relations without disturbing the primary model
- **Cons:** Two sources of truth; `computeEdges` must merge both; worst of both worlds

### Implementation consequences of the decision

1. **DB schema:** `people.parent_ids uuid[]` with `CHECK (array_length(parent_ids, 1) IS NULL OR array_length(parent_ids, 1) <= 2)`. Full SQL in §4.
2. **UI workaround:** Phase 2+ side panel Relationships section shows `Parents: Alice · Bob`. If user has a stepfather, they add him as Mom's **spouse**, not as a parent. Document this in a `docs/data-model.md` that ships with v1.
3. **Migration path to v2:** If/when we promote to `relationships` table, the forward migration is:
   ```sql
   INSERT INTO relationships (tree_id, a_id, b_id, kind, lineage_type)
     SELECT p.tree_id, unnest(p.parent_ids), p.id, 'parent', 'biological'
     FROM people p WHERE array_length(p.parent_ids, 1) > 0;
   -- Then drop the arrays and GIN indexes; update RLS; update `computeEdges`.
   ```
   Estimated v2 migration effort: 1-2 days (schema migration + `computeEdges` refactor + client adaptation).

### Recommendation to user in discuss-phase

> "PROJECT.md specifies `parent_ids` arrays max 2 — I'm keeping this for v1. Real families with step-parents will model the stepfather as Mom's current spouse rather than as a second parent of the child. If user research after launch shows ≥10% of users hitting this wall, v2 migrates to a `relationships` table. Acceptable?"

[ASSUMED: 10% threshold — user should confirm or adjust]

---

## §4. Database schema (migration SQL)

### Source

[CITED: ARCHITECTURE.md §Database Schema] — this research refines and completes that sketch, incorporating PITFALL #6 (SECURITY DEFINER), PITFALL #7 (performance wrappers), PITFALL #18 (cycle detection), and DATA-01..DATA-10.

### Migration file structure

Recommended: `supabase/migrations/20260421000000_initial_schema.sql` (one file, atomic first migration). Split into subsequent migration files only when adding new tables post-launch.

```sql
-- ══════════════════════════════════════════════════════════════════════
-- Migration: 20260421000000_initial_schema.sql
-- Phase 1 — Foundation: trees, tree_members, people, invites
--                       + RLS + indexes + helpers + cycle detection
-- ══════════════════════════════════════════════════════════════════════

begin;

-- ───── Extensions ────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ───── Enums ─────────────────────────────────────────────────────────
create type public.gender as enum ('m', 'f', 'x', 'u');
create type public.tree_role as enum ('owner', 'editor', 'viewer');
create type public.invite_status as enum ('pending', 'accepted', 'revoked');
create type public.member_status as enum ('active', 'pending');

-- ───── trees ─────────────────────────────────────────────────────────
create table public.trees (
  id              uuid primary key default gen_random_uuid(),
  name            text not null default 'My family tree',
  owner_user_id   text not null,               -- Clerk sub (e.g. 'user_2abcXYZ')
  link_share      boolean not null default false,   -- Phase 5 feature, default off
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index trees_owner_user_id_idx on public.trees (owner_user_id);

-- ───── tree_members ──────────────────────────────────────────────────
create table public.tree_members (
  tree_id         uuid not null references public.trees(id) on delete cascade,
  user_id         text not null,               -- Clerk sub
  role            public.tree_role not null,
  status          public.member_status not null default 'active',
  created_at      timestamptz not null default now(),
  primary key (tree_id, user_id)
);
create index tree_members_user_id_idx on public.tree_members (user_id);

-- ───── people ────────────────────────────────────────────────────────
create table public.people (
  id              uuid primary key default gen_random_uuid(),
  tree_id         uuid not null references public.trees(id) on delete cascade,
  name            text not null default '',
  gender          public.gender not null default 'u',
  pronouns        text,
  birth_year      int,
  death_year      int,
  birth_place     text,
  notes           text,
  spouse_ids      uuid[] not null default '{}',
  parent_ids      uuid[] not null default '{}',
  child_ids       uuid[] not null default '{}',
  x               double precision not null default 0,
  y               double precision not null default 0,
  is_me           boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- DATA-06: parent_ids max 2, self-parent rejected
  constraint people_parent_ids_max_2
    check (array_length(parent_ids, 1) is null or array_length(parent_ids, 1) <= 2),
  constraint people_no_self_parent
    check (not (id = any(parent_ids))),
  constraint people_no_self_spouse
    check (not (id = any(spouse_ids))),
  constraint people_no_self_child
    check (not (id = any(child_ids))),
  constraint people_birth_death_order
    check (death_year is null or birth_year is null or death_year >= birth_year)
);
create index people_tree_id_idx        on public.people (tree_id);
create index people_spouse_ids_gin     on public.people using gin (spouse_ids);
create index people_parent_ids_gin     on public.people using gin (parent_ids);
create index people_child_ids_gin      on public.people using gin (child_ids);

-- DATA-09: exactly zero or one is_me=true person per tree
create unique index people_is_me_unique_per_tree
  on public.people (tree_id) where is_me = true;

-- ───── invites ───────────────────────────────────────────────────────
create table public.invites (
  id              uuid primary key default gen_random_uuid(),
  tree_id         uuid not null references public.trees(id) on delete cascade,
  email           text not null,
  role            public.tree_role not null default 'viewer',
  status          public.invite_status not null default 'pending',
  invited_by      text not null,               -- Clerk sub of inviter
  token           text not null unique,        -- random URL-safe token
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz
);
create index invites_tree_id_idx on public.invites (tree_id);
create index invites_email_idx   on public.invites (email);

-- ───── updated_at triggers ───────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_people_updated_at
  before update on public.people
  for each row execute function public.touch_updated_at();
create trigger trg_trees_updated_at
  before update on public.trees
  for each row execute function public.touch_updated_at();

-- ───── SECURITY DEFINER helper: user_tree_ids ───────────────────────
-- PITFALL #6: breaks cross-table RLS recursion by bypassing RLS on lookup
create or replace function public.user_tree_ids(uid text)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select tree_id from public.tree_members where user_id = uid and status = 'active'
$$;

-- ───── Cycle detection (DATA-07) ─────────────────────────────────────
-- Walks ancestor graph via parent_ids. Returns true if `candidate_parent_id`
-- is a descendant of `child_id` (which would create a cycle).
create or replace function public.creates_parent_cycle(
  p_tree_id uuid,
  p_child_id uuid,
  p_candidate_parent_id uuid
) returns boolean language plpgsql stable as $$
declare
  visited uuid[] := array[]::uuid[];
  queue uuid[] := array[p_candidate_parent_id];
  cur uuid;
  parents uuid[];
begin
  -- Self-parent shortcut (also enforced by CHECK constraint)
  if p_child_id = p_candidate_parent_id then return true; end if;
  while array_length(queue, 1) > 0 loop
    cur := queue[1];
    queue := queue[2:];
    if cur = any(visited) then continue; end if;
    visited := visited || cur;
    -- If we can reach p_child_id walking UP parents from candidate, cycle.
    if cur = p_child_id then return true; end if;
    select p.parent_ids into parents from public.people p
      where p.id = cur and p.tree_id = p_tree_id;
    if parents is not null then queue := queue || parents; end if;
  end loop;
  return false;
end;
$$;

-- ───── Enable RLS ────────────────────────────────────────────────────
alter table public.trees         enable row level security;
alter table public.tree_members  enable row level security;
alter table public.people        enable row level security;
alter table public.invites       enable row level security;
alter table public.trees         force row level security;
alter table public.tree_members  force row level security;
alter table public.people        force row level security;
alter table public.invites       force row level security;

-- ───── RLS policies — see §5 for full discussion ─────────────────────
-- trees
create policy "trees_select_if_accessible" on public.trees for select
  using (
    owner_user_id = (select auth.jwt()->>'sub')
    or link_share = true
    or id in (select public.user_tree_ids((select auth.jwt()->>'sub')))
  );
create policy "trees_insert_own" on public.trees for insert
  with check (owner_user_id = (select auth.jwt()->>'sub'));
create policy "trees_update_if_owner_or_editor" on public.trees for update
  using (
    owner_user_id = (select auth.jwt()->>'sub')
    or exists (
      select 1 from public.tree_members tm
      where tm.tree_id = trees.id
        and tm.user_id = (select auth.jwt()->>'sub')
        and tm.role in ('owner', 'editor')
        and tm.status = 'active'
    )
  );
create policy "trees_delete_if_owner" on public.trees for delete
  using (owner_user_id = (select auth.jwt()->>'sub'));

-- tree_members
create policy "tree_members_select_own_or_co_member" on public.tree_members for select
  using (
    user_id = (select auth.jwt()->>'sub')
    or tree_id in (select public.user_tree_ids((select auth.jwt()->>'sub')))
  );
create policy "tree_members_insert_by_owner" on public.tree_members for insert
  with check (
    exists (
      select 1 from public.trees t
      where t.id = tree_members.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  );
create policy "tree_members_update_by_owner" on public.tree_members for update
  using (
    exists (
      select 1 from public.trees t
      where t.id = tree_members.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  );
create policy "tree_members_delete_by_owner_or_self" on public.tree_members for delete
  using (
    user_id = (select auth.jwt()->>'sub')
    or exists (
      select 1 from public.trees t
      where t.id = tree_members.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  );

-- people
create policy "people_select_if_tree_accessible" on public.people for select
  using (
    tree_id in (select public.user_tree_ids((select auth.jwt()->>'sub')))
    or exists (
      select 1 from public.trees t
      where t.id = people.tree_id
        and (t.owner_user_id = (select auth.jwt()->>'sub') or t.link_share = true)
    )
  );
create policy "people_insert_if_editor_or_owner" on public.people for insert
  with check (
    exists (
      select 1 from public.trees t
      where t.id = people.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
    or exists (
      select 1 from public.tree_members tm
      where tm.tree_id = people.tree_id
        and tm.user_id = (select auth.jwt()->>'sub')
        and tm.role in ('owner', 'editor')
        and tm.status = 'active'
    )
  );
create policy "people_update_if_editor_or_owner" on public.people for update
  using (
    exists (
      select 1 from public.trees t
      where t.id = people.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
    or exists (
      select 1 from public.tree_members tm
      where tm.tree_id = people.tree_id
        and tm.user_id = (select auth.jwt()->>'sub')
        and tm.role in ('owner', 'editor')
        and tm.status = 'active'
    )
  );
create policy "people_delete_if_editor_or_owner" on public.people for delete
  using (
    exists (
      select 1 from public.trees t
      where t.id = people.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
    or exists (
      select 1 from public.tree_members tm
      where tm.tree_id = people.tree_id
        and tm.user_id = (select auth.jwt()->>'sub')
        and tm.role in ('owner', 'editor')
        and tm.status = 'active'
    )
  );

-- invites (owner only; accept-by-token flow uses a SECURITY DEFINER function)
create policy "invites_select_if_owner" on public.invites for select
  using (
    exists (
      select 1 from public.trees t
      where t.id = invites.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  );
create policy "invites_mutate_if_owner" on public.invites for all
  using (
    exists (
      select 1 from public.trees t
      where t.id = invites.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  )
  with check (
    exists (
      select 1 from public.trees t
      where t.id = invites.tree_id
        and t.owner_user_id = (select auth.jwt()->>'sub')
    )
  );

commit;
```

### Design notes

1. **`force row level security`** on every table — without this, table owners bypass RLS silently. Important defense-in-depth.
2. **`(select auth.jwt()->>'sub')`** wrap — per PITFALL #7, this triggers initPlan caching so the expression is evaluated once per query, not once per row. Measurable difference at ≥ 200 rows.
3. **`user_tree_ids()` is SECURITY DEFINER** — it bypasses RLS for the inner `tree_members` lookup, preventing the `people → trees → tree_members → people` recursion that PITFALL #6 warns about.
4. **`member_status` enum with `'active' | 'pending'`** — allows us to store an invited-but-not-yet-accepted row. Phase 5 will use `pending` for share flow. Phase 1 only writes `active` (owner on tree creation).
5. **`creates_parent_cycle()`** — called from a server action guard, not from a CHECK constraint (CHECKs cannot reference other rows). The guard is in `addRelative` / `updatePerson` server actions (Phase 3 logic, but function lives in Phase 1 schema).

### What this schema deliberately OMITS (v2)

- `photo_url` on people (RICH-01)
- `started_year`, `ended_year` on spouse relationships (RICH-04)
- `lineage_type` on parent relationships (RICH-04)
- `version` column for optimistic concurrency (not needed — server actions are authoritative, RLS enforces write permissions)
- Event-sourced audit log (not needed for v1; Realtime broadcast covers live sync)

---

## §5. RLS policy deep-dive (DATA-05, TREE-04)

### Four-table access matrix

| Who | `trees` | `tree_members` | `people` | `invites` |
|-----|---------|----------------|----------|-----------|
| Owner (creator) | R/U/D all own trees | R all members; U/D all; I new members | R/I/U/D all people in own trees | R/I/U/D all invites |
| Editor (invited with role=editor) | R + U (rename) | R own + co-members | R/I/U/D all people in tree | — (no access) |
| Viewer (invited with role=viewer) | R only | R own + co-members | R only | — |
| Stranger | — | — | — | — |
| Link-share visitor (Phase 5) | R tree if `link_share=true` | — | R people if tree.link_share=true | — |

### Policy patterns (four operations × four tables = 16 policies)

Full SQL in §4 migration. Key design points:

**SELECT on `trees`:**
```sql
using (
  owner_user_id = (select auth.jwt()->>'sub')   -- fast path for owner
  or link_share = true                           -- Phase 5: public view
  or id in (select public.user_tree_ids(...))    -- SECURITY DEFINER avoids recursion
)
```

**INSERT on `trees`:**
```sql
with check (owner_user_id = (select auth.jwt()->>'sub'))
```
— Prevents User A from creating a tree owned by User B. No matter what's in the request body, the check forces `owner_user_id` to equal the JWT sub. This is the "user cannot INSERT a row claiming another user's sub" protection the orchestrator asked about.

**INSERT on `tree_members`:**
```sql
with check (
  exists (select 1 from public.trees t
          where t.id = tree_members.tree_id
            and t.owner_user_id = (select auth.jwt()->>'sub'))
)
```
— Only the tree owner can add members. Share flow in Phase 5 goes through this policy. The check evaluates OWNER status on the *target tree*, not on the new member row.

**On first tree creation, the owner row is inserted too:**
Server action performs this atomically:
```sql
insert into trees (...) values (...);           -- policy: trees_insert_own
insert into tree_members (tree_id, user_id, role, status)
  values ($1, $2, 'owner', 'active');          -- policy: tree_members_insert_by_owner
```
— Both inserts are authorized because the user created the tree (owner_user_id matches JWT sub).

### Recursion prevention (PITFALL #6)

Naïve RLS on `people` would be:
```sql
using (tree_id in (select tree_id from tree_members where user_id = auth.jwt()->>'sub'))
```
But `tree_members` has its own RLS policy that references `people` (via the co-member check). Postgres detects the cycle at runtime → `ERROR: infinite recursion detected in policy for relation "..."`.

**Fix:** `user_tree_ids(uid)` is `SECURITY DEFINER`. Inside the function, RLS on `tree_members` is bypassed. From outside, the call reduces to a plain SETOF UUID. The recursion chain breaks at the function boundary.

### Performance (PITFALL #7)

At 500 people in a shared tree, naïve policy runs the subquery 500 times. Fixes:
1. `(select auth.jwt()->>'sub')` wrapper → initPlan caching
2. `user_tree_ids(uid)` is marked `STABLE` → optimizer caches result per query
3. GIN indexes on `tree_members(user_id)` and `tree_members(tree_id)` are already present

**Target:** p95 latency on `people` SELECT at 200 rows < 100ms. Verify with `EXPLAIN ANALYZE` once seeded.

### Realtime authorization (NOTE: Phase 5 concern, flagged here)

The orchestrator asked about confirming Supabase Realtime respects RLS. Answer: **Realtime Postgres CDC (`postgres_changes`) honors RLS automatically**. **Realtime Broadcast is a separate layer** — per `realtime.messages` RLS, not table RLS. [CITED: supabase.com/docs/guides/realtime/authorization]

> This research explicitly does NOT write the Broadcast authorization policies — they depend on `tree_members` role enforcement for viewer-can't-write semantics, which is a Phase 5 concern. Phase 1 only needs the four-table RLS above; Broadcast policies land in Phase 5's RESEARCH.md.

### Testing RLS (Phase 1 deliverable)

Plan should include a `tests/rls.test.ts` (or SQL integration test) that:
1. Creates two Clerk test users (via Clerk API in CI)
2. User A creates tree + seeds "You" person
3. User B's server-side Supabase client (with B's JWT) queries `trees` → returns `[]`
4. User B queries `people` where `tree_id = A.treeId` → returns `[]`
5. User B attempts `INSERT INTO people (tree_id, ...) values (A.treeId, ...)` → fails with RLS violation
6. Owner updates tree name → succeeds
7. Link-share toggle goes on → User B can SELECT people but not INSERT

[ASSUMED: Playwright's `request` fixture can impersonate Clerk sessions via Clerk's "Testing tokens" API. If this test is infeasible in Phase 1 CI without more setup, defer to Phase 2 as a manual dev-env check.]

---

## §6. First-login bootstrap flow (TREE-01)

### Decision: **Server action on first authenticated root load, idempotent via SELECT-before-INSERT.**

### Alternatives considered

**A. Clerk webhook (`user.created`) → server creates tree** — REJECTED because:
- Adds a new attack surface (webhook endpoint)
- Latency: tree creation happens before user even lands on the app, but if webhook is slow, first load races
- Hard to keep idempotent if webhook fires twice
- Extra infra for a one-shot operation

**B. Client-side "create on first load" via Supabase RPC** — REJECTED because:
- Harder to atomic-insert tree + tree_member + seed person (multiple round trips)
- Double-click race if user loads root and another tab at the same time
- RLS policy on INSERT is duplicated across client and server action

**C. Server action on root `/` page load (CHOSEN)**
- Runs in RSC, one-shot per request
- Idempotency via `INSERT ... ON CONFLICT DO NOTHING` on `(owner_user_id)` — see below
- Atomic: the server action inserts tree + tree_members(owner) + seed person in one transaction
- No webhook infra

### Bootstrap server action

```ts
// app/actions/bootstrap.ts
'use server';

import { redirect } from 'next/navigation';
import { getUserIdOrThrow, getUserProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Called from the root page `app/page.tsx`. Returns the tree id the user
 * should be redirected to.
 *
 * Logic:
 * 1. If user has any trees they own or are a member of, return their most
 *    recently opened (or first-by-id for v1).
 * 2. Else create a new tree + owner membership + seeded "You" person in
 *    one transaction and return its id.
 *
 * Idempotency: serialized by the "exists an owned tree" check; double-click
 * on first load could in theory create two trees, but in practice RSC runs
 * once per request. If we see duplicate-tree reports, add a Postgres advisory
 * lock on the user_id.
 */
export async function resolveOrBootstrapTree(): Promise<string> {
  const userId = await getUserIdOrThrow();
  const supabase = await supabaseServer();

  // Step 1: find an existing tree (owned or invited)
  const { data: memberships } = await supabase
    .from('tree_members')
    .select('tree_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (memberships && memberships.length > 0) {
    return memberships[0].tree_id;
  }

  // Step 2: bootstrap a new tree. Use a Postgres function for atomicity.
  const profile = await getUserProfile();
  const initialName = 'My family tree';

  // RPC function (added to migration — see below) performs the 3 inserts
  // atomically and returns the new tree_id.
  const { data, error } = await supabase.rpc('bootstrap_tree', {
    p_owner_user_id: userId,
    p_tree_name: initialName,
    p_seed_person_name: profile?.displayName ?? 'You',
  });

  if (error || !data) {
    throw new Error(`Failed to bootstrap tree: ${error?.message ?? 'unknown'}`);
  }
  return data as string;
}
```

### Supporting Postgres RPC (add to migration)

```sql
-- Adds to 20260421000000_initial_schema.sql

create or replace function public.bootstrap_tree(
  p_owner_user_id text,
  p_tree_name text,
  p_seed_person_name text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_tree_id uuid;
  new_person_id uuid;
begin
  -- Sanity: caller must match JWT sub
  if p_owner_user_id is null or p_owner_user_id <> (auth.jwt()->>'sub') then
    raise exception 'UNAUTHORIZED: p_owner_user_id must equal JWT sub';
  end if;

  -- Insert tree
  insert into public.trees (name, owner_user_id)
    values (p_tree_name, p_owner_user_id)
    returning id into new_tree_id;

  -- Insert owner membership
  insert into public.tree_members (tree_id, user_id, role, status)
    values (new_tree_id, p_owner_user_id, 'owner', 'active');

  -- Seed "You" person
  insert into public.people (tree_id, name, is_me, x, y)
    values (new_tree_id, p_seed_person_name, true, 0, 0)
    returning id into new_person_id;

  return new_tree_id;
end;
$$;

-- Allow authenticated users to call the RPC
grant execute on function public.bootstrap_tree(text, text, text) to authenticated;
```

### Root page

```tsx
// app/page.tsx
import { redirect } from 'next/navigation';
import { resolveOrBootstrapTree } from './actions/bootstrap';

export const dynamic = 'force-dynamic';

export default async function Root() {
  const treeId = await resolveOrBootstrapTree();
  redirect(`/tree/${treeId}`);
}
```

### Why `SECURITY DEFINER` on the RPC

The RPC bypasses RLS for the three inserts. Why safe: the function body explicitly asserts `p_owner_user_id = auth.jwt()->>'sub'`, so a caller cannot create a tree owned by someone else. This is the standard pattern for "atomic multi-row operations that would otherwise require N RLS evaluations."

### Idempotency / race conditions

- Single RSC request → no race within a single navigation
- Double-tab at sign-in time → worst case two trees created; user sees one, rediscovers the second in switcher. Acceptable for v1. If this becomes a user complaint, add:
  ```sql
  select pg_advisory_xact_lock(hashtext(p_owner_user_id));
  ```
  at the top of `bootstrap_tree()`.
- Clerk webhook that tries to bootstrap → we're NOT using webhooks for this. Keep it RSC-driven.

---

## §7. Tree switcher + invited trees (TREE-02, TREE-03, TREE-04)

### Query shape: **inline server action + single RLS-scoped SELECT**

No view, no RPC needed. RLS already gates the query; just SELECT with a JOIN.

```ts
// app/actions/trees.ts
'use server';

import { getUserIdOrThrow } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export type TreeListItem = {
  id: string;
  name: string;
  ownerUserId: string;
  role: 'owner' | 'editor' | 'viewer';
  memberCount: number;
  updatedAt: string;
};

export async function listMyTrees(): Promise<TreeListItem[]> {
  const userId = await getUserIdOrThrow();
  const supabase = await supabaseServer();

  // One query: get every tree the user is a member of, with their role.
  // RLS enforces "I can only see trees I'm a member of or own" — no extra filter.
  const { data, error } = await supabase
    .from('tree_members')
    .select(`
      role,
      tree:trees!inner(
        id,
        name,
        owner_user_id,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { foreignTable: 'trees', ascending: false });

  if (error) throw new Error(`listMyTrees failed: ${error.message}`);
  if (!data) return [];

  return data.map((row: any) => ({
    id: row.tree.id,
    name: row.tree.name,
    ownerUserId: row.tree.owner_user_id,
    role: row.role as 'owner' | 'editor' | 'viewer',
    memberCount: 0,  // Populate in Phase 5 via aggregation; not needed in Phase 1 UI
    updatedAt: row.tree.updated_at,
  }));
}

export async function createNewTree(name = 'Untitled tree'): Promise<string> {
  const userId = await getUserIdOrThrow();
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('bootstrap_tree', {
    p_owner_user_id: userId,
    p_tree_name: name,
    p_seed_person_name: 'You',
  });
  if (error || !data) throw new Error(`createNewTree failed: ${error?.message}`);
  return data as string;
}

export async function renameTree(treeId: string, name: string): Promise<void> {
  const userId = await getUserIdOrThrow();
  const trimmed = name.trim().slice(0, 80);
  if (trimmed.length === 0) return;  // Silent revert per UI-SPEC
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('trees')
    .update({ name: trimmed })
    .eq('id', treeId);
  if (error) throw new Error(`renameTree failed: ${error.message}`);
}
```

### UI grouping in switcher (UI-SPEC sections: `YOUR TREES` vs `SHARED WITH YOU`)

Client-side: split the `TreeListItem[]` by `role === 'owner'` vs `role !== 'owner'`. No extra query needed.

```tsx
const owned = trees.filter(t => t.role === 'owner');
const shared = trees.filter(t => t.role !== 'owner');
```

### RLS implications

- `listMyTrees` uses the `tree_members_select_own_or_co_member` policy on `tree_members` → returns only the user's rows
- The joined `trees` select uses `trees_select_if_accessible` → allows read for owner, member, or link-share
- Both evaluate to the same effective set for a member querying their own memberships
- **No SQL injection concern** — Supabase client parameterizes all values
- **No extra indexes needed** — `tree_members.user_id` index (added in §4) covers this query

### Alternative rejected: Postgres view

A `my_trees` view was considered. REJECTED because:
- Views complicate RLS (`security_invoker` vs `security_definer`) — recent Supabase docs have caveats
- The inline query is 10 lines and trivially debuggable
- Changing the query shape (e.g., add `memberCount` in Phase 5) is easier in TypeScript than in a view migration

---

## §8. Common Pitfalls (Phase 1 scope only)

> Full pitfalls catalog is in `.planning/research/PITFALLS.md`. The five below are the ONLY ones that belong to Phase 1. Tasks must include verification steps for each.

### Pitfall 1-1: RLS recursion on cross-table check

**From PITFALLS.md #6** — quoted verbatim:

> **What goes wrong:**
> The RLS policy on `people` checks "is the current user a member of the tree?" by joining to `tree_members`. `tree_members` has its own RLS policy that references `people`. Postgres detects the cycle and throws at runtime — a 500 in production, not at migration time.

**Mitigation in Phase 1:** `user_tree_ids(uid)` SECURITY DEFINER helper (§4, §5). Policies use the helper, not direct joins. Every policy has been written to route through the helper where a cross-table check would otherwise occur.

**Verification step for plan:**
- After migrations applied, run `psql` with a test user JWT and `SELECT * FROM people WHERE tree_id = '...';` → should return rows, NOT `ERROR: infinite recursion detected`

### Pitfall 1-2: `auth.uid()` instead of `auth.jwt()->>'sub'`

**From PITFALLS.md Anti-Pattern #3** — quoted verbatim:

> **What people do:** Copy-paste a Supabase-auth RLS tutorial using `auth.uid() = user_id`.
>
> **Why it's wrong:** `auth.uid()` casts the JWT `sub` to a UUID. Clerk user ids are strings like `user_2abcXYZ` — the cast fails, and every policy silently rejects.

**Mitigation in Phase 1:** Every policy in §4 uses `(select auth.jwt()->>'sub')`. CI linter should grep for `auth.uid()` in `*.sql` files and fail build.

**Verification step for plan:**
- `grep -rn 'auth\.uid()' supabase/migrations/ && exit 1` in CI (zero occurrences expected)
- RLS smoke test: authenticated user can read their own tree; returns `[]` otherwise

### Pitfall 1-3: Clerk `auth()` called without middleware

**From PITFALLS.md #11** — quoted verbatim:

> **What goes wrong:**
> Server component calls `auth()` and gets `{ userId: null }` even for logged-in users. Or: throws "auth() was called but Clerk can't detect usage of clerkMiddleware()."

**Mitigation in Phase 1:**
- `middleware.ts` at project root (not inside `app/` or `src/` unless src-dir)
- Exact matcher from §2 Step 4 (Clerk's official reference)
- Do NOT call `auth()` in `app/layout.tsx`
- Use a child layout (`app/(app)/layout.tsx`) for auth-dependent rendering

**Verification step for plan:**
- E2E: sign in → `auth()` in `resolveOrBootstrapTree()` returns `{ userId: 'user_...' }`
- E2E: visit `/sign-in` unauthenticated → no "auth() was called" error

### Pitfall 1-4: Clerk `currentUser()` passed across server/client boundary

**From PITFALLS.md #12** — quoted verbatim:

> **What goes wrong:**
> Next.js throws "Only plain objects can be passed to Client Components from Server Components" when passing the full user object as a prop.

**Mitigation in Phase 1:**
- `getUserProfile()` helper in `lib/auth.ts` (§2 Step 7) projects to `{ id, displayName, email, avatarUrl }` before passing as prop
- NEVER `JSON.parse(JSON.stringify(user))` — hides issues and ships PII
- Prefer `useUser()` client hook in interactive UI

**Verification step for plan:**
- TypeScript: the `<UserMenu>` component's prop type is `{ displayName: string; email: string; avatarUrl: string | null }` — not `User` from Clerk

### Pitfall 1-5: Cycles & self-parents in the family graph

**From PITFALLS.md #18** — quoted verbatim:

> **What goes wrong:**
> A user accidentally sets Person A as Person B's child *and* B as A's child (self-reference loop in a poorly designed form). Or imports bad data where Alice is her own grandmother. Rendering recurses infinitely; layout never completes; server CPU hits 100%.

**Mitigation in Phase 1 (schema only):**
- CHECK constraints reject self-parent/spouse/child (§4)
- Unique partial index enforces `is_me=true` exactly once per tree (§4)
- `creates_parent_cycle()` function exists (§4) — called by Phase 3 `addRelative` server action

**Verification step for plan:**
- SQL smoke test: `INSERT INTO people (id, tree_id, parent_ids) VALUES ('a', 't', '{a}')` → fails with CHECK violation
- SQL smoke test: two `is_me=true` inserts into same tree → second fails with unique violation

### Pitfall 1-6: CVE-2025-29927 (Next.js middleware bypass)

**From PITFALLS.md Security Mistakes table** and the orchestrator's DEP-02 note.

**What goes wrong:** Attacker sends `x-middleware-subrequest` header to bypass Clerk middleware, reaching pages that assume auth.

**Mitigation in Phase 1:**
- Pin `next@16.2.4` (Next 16 is already past the CVE fix)
- Never rely on middleware ALONE for authz — every server action re-checks `auth()` (already the pattern in §6, §7)
- If deploying to a non-Vercel proxy, strip `x-middleware-subrequest` at the edge

**Verification step for plan:**
- `package.json` has `"next": "16.2.4"` (not `^14`, not `^15`)
- Server action test: request with `x-middleware-subrequest: 1` header → still requires auth

---

## §9. Migrations strategy

### Decision: **Supabase CLI migrations checked into `supabase/migrations/`, one file for Phase 1, timestamped.**

### Structure

```
czfamtree/
├── supabase/
│   ├── config.toml                              # local dev config (incl. [auth.third_party.clerk])
│   ├── migrations/
│   │   └── 20260421000000_initial_schema.sql    # everything from §4
│   └── seed.sql                                 # optional: dev-only seed data for local testing
```

### Commands

```bash
# Initialize Supabase in repo (run once)
npx supabase init

# Start local stack (Postgres + Realtime + Studio)
npx supabase start

# Create a new migration (use this for all future changes)
npx supabase migration new <name>

# Apply migrations to local db
npx supabase db reset

# Generate TypeScript types from schema
npx supabase gen types typescript --local > lib/supabase/types.ts

# Link to cloud project (once)
npx supabase link --project-ref <project-ref>

# Push migration to cloud
npx supabase db push
```

### Why migrations not schema.sql

- **Incremental deployability** — v2 features (photos, step-relations) become `20270101_photos.sql` etc., applied in order. A single `schema.sql` forces destructive resets.
- **Reviewable diffs** — PR review on a new migration file vs "what changed in the monster schema.sql"
- **Matches Supabase CLI defaults** — `supabase db reset` expects `supabase/migrations/`
- **Rollback-friendly** — add `down` SQL when needed (Supabase supports `..._down.sql`)

### Seed data (local dev only, not prod)

```sql
-- supabase/seed.sql (run only in local dev via `supabase db reset`)
-- Inject a fake Clerk user id for local testing
insert into public.trees (id, name, owner_user_id) values
  ('11111111-1111-1111-1111-111111111111', 'Demo family', 'user_demo_local');
insert into public.tree_members (tree_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'user_demo_local', 'owner');
insert into public.people (tree_id, name, is_me) values
  ('11111111-1111-1111-1111-111111111111', 'You (demo)', true);
```

> **CAUTION:** Supabase seeds run AFTER RLS is enabled. To let them run, the CLI connects as `postgres` (superuser), so RLS is bypassed. But INSERTs from the local app (during e.g. Playwright tests) will go through RLS — so test users must have valid Clerk JWTs. Use Clerk's Testing Tokens API in CI.

### Generate types

After migrations applied:
```bash
npx supabase gen types typescript --local > lib/supabase/types.ts
```
Then:
```ts
// lib/supabase/server.ts (updated)
import { Database } from './types';
export async function supabaseServer() {
  return createClient<Database>(/* ... */);
}
```

This gives full type safety on `.from('people').select(...)`.

---

## §10. Tailwind v4 + design tokens (DESIGN-03)

### Setup

**`app/globals.css`:**
```css
@import "tailwindcss";

/* Handoff CSS variables — DESIGN-03 pixel-parity source of truth */
:root {
  /* Colors (OKLCH, copied verbatim from handoff styles.css) */
  --bg:           oklch(0.985 0.003 80);
  --bg-soft:      oklch(0.965 0.004 80);
  --bg-card:      oklch(1 0 0);
  --ink:          oklch(0.18 0.008 80);
  --ink-2:        oklch(0.38 0.006 80);
  --ink-3:        oklch(0.62 0.006 80);
  --rule:         oklch(0.88 0.005 80);
  --rule-soft:    oklch(0.93 0.004 80);
  --accent:       oklch(0.52 0.14 250);
  --accent-soft:  oklch(0.94 0.03 250);
  --success:      oklch(0.62 0.13 150);
  --danger:       oklch(0.55 0.17 25);
}

/* Tailwind v4 @theme block — maps CSS vars → Tailwind tokens */
@theme {
  --color-bg:           var(--bg);
  --color-bg-soft:      var(--bg-soft);
  --color-bg-card:      var(--bg-card);
  --color-ink:          var(--ink);
  --color-ink-2:        var(--ink-2);
  --color-ink-3:        var(--ink-3);
  --color-rule:         var(--rule);
  --color-rule-soft:    var(--rule-soft);
  --color-accent:       var(--accent);
  --color-accent-soft:  var(--accent-soft);
  --color-success:      var(--success);
  --color-danger:       var(--danger);

  /* Spacing tokens (4px multiples per UI-SPEC §Spacing Scale) */
  --spacing-2xs: 4px;
  --spacing-sm:  8px;
  --spacing-md:  12px;
  --spacing-lg:  16px;
  --spacing-xl:  20px;
  --spacing-2xl: 24px;
  --spacing-3xl: 32px;
  --spacing-4xl: 48px;

  /* Fonts (next/font/google loads into these vars) */
  --font-sans: var(--font-inter, 'Inter'), 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --font-mono: var(--font-jetbrains-mono, 'JetBrains Mono'), ui-monospace, 'SF Mono', Menlo, monospace;

  /* Radius — Swiss design says 0 everywhere except avatars */
  --radius: 0;
  --radius-avatar: 9999px;
}

/* Global Inter font features (UI-SPEC) */
body {
  font-family: var(--font-sans);
  font-feature-settings: 'ss01', 'cv11';
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}

/* Global focus-visible ring (UI-SPEC Accessibility) */
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Reduced motion (UI-SPEC Accessibility) */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**`app/layout.tsx`:**
```tsx
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-inter',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains-mono',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### Usage in components

```tsx
// Tailwind v4 picks up --color-* tokens automatically
<div className="bg-bg-card border border-ink text-ink p-lg">
  Hello world
</div>

// Arbitrary values still available for handoff component constants
<button className="px-[14px] py-sm border border-ink bg-bg-card">
  Continue with Google
</button>
```

### Tailwind config (NONE needed)

Per Tailwind v4, `tailwind.config.js` / `.ts` is no longer required when using `@theme` in CSS. [CITED: tailwindcss.com/docs/theme]

### Verification

- [ ] `npm run dev` shows tokens applied (no CSS errors in browser console)
- [ ] `bg-ink` renders the OKLCH color (inspect in DevTools — computed value matches `oklch(0.18 0.008 80)`)
- [ ] Inter loads (DevTools → Network → `*.woff2` from Google Fonts)
- [ ] `<input>` :focus shows 2px accent outline

---

## §11. Clerk `<SignIn />` appearance customization (AUTH-04, DESIGN-03)

### Decision: **Use Clerk hosted `<SignIn />` with `appearance.variables` + `appearance.elements` overrides. Accept 80% pixel-parity; document 20% unreachable fidelity as a known gap.**

### Source

[CITED: clerk.com/docs/nextjs/guides/customizing-clerk/appearance-prop/variables — verified list of all `variables` keys]
[CITED: clerk.com/docs/customization/overview]

### `appearance.variables` mapping to handoff tokens

```tsx
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
'use client';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        variables: {
          colorPrimary:            'oklch(0.18 0.008 80)',   // --ink
          colorDanger:             'oklch(0.55 0.17 25)',    // --danger
          colorSuccess:            'oklch(0.62 0.13 150)',   // --success
          colorWarning:            'oklch(0.72 0.14 75)',    // (not in handoff, but needed)
          colorNeutral:            'oklch(0.88 0.005 80)',   // --rule (for borders/hovers)
          colorForeground:         'oklch(0.18 0.008 80)',   // --ink
          colorPrimaryForeground:  'oklch(1 0 0)',           // white on ink
          colorMutedForeground:    'oklch(0.62 0.006 80)',   // --ink-3
          colorMuted:              'oklch(0.965 0.004 80)',  // --bg-soft
          colorBackground:         'oklch(1 0 0)',           // --bg-card
          colorInput:              'oklch(1 0 0)',           // white input bg
          colorInputForeground:    'oklch(0.18 0.008 80)',   // --ink
          colorBorder:             'oklch(0.88 0.005 80)',   // --rule
          colorRing:               'oklch(0.52 0.14 250)',   // --accent (focus)
          colorShadow:             'oklch(0.18 0.008 80)',   // --ink (hard shadow)
          colorModalBackdrop:      'rgba(24, 18, 11, 0.4)',  // ink at 40% (backdrop)

          fontFamily:        'var(--font-inter, Inter), sans-serif',
          fontFamilyButtons: 'var(--font-inter, Inter), sans-serif',
          fontSize:          '0.8125rem',   // 13px base (matches UI-SPEC label size)
          fontWeight:        { normal: 400, medium: 600, semibold: 600, bold: 600 }, // drop 500
          borderRadius:      '0',            // Swiss — no rounded corners
          spacing:           '1rem',
        },
        elements: {
          // Card container — match handoff Swiss card with hard shadow
          card: 'border border-ink shadow-[4px_4px_0_var(--ink)] rounded-none',
          rootBox: 'w-full max-w-[320px]',

          // Header (logo/title hidden — handoff's login layout already has brand)
          headerTitle: 'hidden',
          headerSubtitle: 'hidden',
          logoBox: 'hidden',

          // Social buttons ("Continue with Google", "Continue with Apple")
          socialButtonsBlockButton:
            'border border-ink bg-bg-card rounded-none text-ink font-semibold text-[13px] ' +
            'py-sm px-[14px] hover:translate-x-[-2px] hover:translate-y-[-2px] ' +
            'hover:shadow-[4px_4px_0_var(--ink)] transition-all duration-150',
          socialButtonsBlockButtonText: 'font-semibold text-[13px]',
          socialButtonsProviderIcon: 'w-[18px] h-[18px]',

          // Divider between socials and email
          dividerRow: 'my-md',
          dividerLine: 'bg-rule',
          dividerText: 'text-ink-3 font-mono text-[11px] tracking-[0.12em] uppercase',

          // Email input + submit
          formFieldInput:
            'border border-rule bg-bg-card rounded-none text-[14px] py-sm px-md ' +
            'focus:border-accent focus:outline-none',
          formFieldLabel: 'text-ink text-[13px] font-semibold',
          formButtonPrimary:
            'border border-ink bg-ink text-bg-card rounded-none text-[13px] font-semibold ' +
            'py-sm px-[14px] hover:translate-x-[-2px] hover:translate-y-[-2px] ' +
            'hover:shadow-[4px_4px_0_var(--accent)] transition-all duration-150',

          // Footer (privacy/terms links) - mono micro style
          footer: 'bg-bg mt-lg',
          footerActionText: 'text-ink-3 font-mono text-[11px]',
          footerActionLink: 'text-ink font-mono text-[11px] underline',

          // Misc
          formFieldErrorText: 'text-danger text-[11px] font-mono',
          identityPreviewText: 'text-ink text-[13px]',
          identityPreviewEditButton: 'text-accent text-[13px] underline',
        },
        layout: {
          // Hide default Clerk logo + powered-by since we have own brand on the left
          logoImageUrl: '',
          showOptionalFields: false,
          socialButtonsPlacement: 'top',
          socialButtonsVariant: 'blockButton',
        },
      }}
      // Keep Clerk's hosted routing — handles callback, errors, email flow
    />
  );
}
```

### Layout wrapper (split 50/50 per UI-SPEC)

```tsx
// app/(auth)/layout.tsx
import SignInIllustration from '@/components/auth/SignInIllustration';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left pane: brand + Clerk <SignIn /> */}
      <div className="flex w-1/2 flex-col justify-between border-r border-rule bg-bg p-4xl">
        <div className="flex items-center gap-md">
          <span className="grid h-[28px] w-[28px] place-items-center bg-ink text-bg-card font-mono text-[11px]">
            CZ
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.005em]">Family Tree</span>
        </div>
        <div>
          <h1 className="max-w-[480px] text-[48px] font-semibold leading-[1.05] tracking-[-0.025em]">
            Every name, a branch.
            <br />
            Every branch, a story.
          </h1>
          <p className="mt-md max-w-[420px] text-[14px] leading-[1.5] text-ink-2">
            Build your family tree by clicking, dragging, and connecting — or invite relatives
            to collaborate in real time.
          </p>
          <div className="mt-xl">{children /* <SignIn /> */}</div>
        </div>
        <div className="flex justify-between text-[11px] text-ink-3 font-mono">
          <span>v0.1 · preview</span>
          <span>Private by default</span>
        </div>
      </div>

      {/* Right pane: decorative illustration */}
      <div className="w-1/2 bg-bg-soft">
        <SignInIllustration />
      </div>
    </div>
  );
}
```

### Reachability assessment

**WHAT `appearance` CAN DO:**
- ✅ Border radius 0 globally
- ✅ Color tokens mapped to OKLCH (Clerk renders CSS-custom-property values)
- ✅ Font family override
- ✅ Button padding/border/shadow via `elements` classes
- ✅ Hide Clerk's own header/logo (we provide brand in layout)

**WHAT `appearance` CANNOT DO (20% gap):**
- ❌ Change the `<SignIn />` structural markup (e.g., put the email field side-by-side with socials)
- ❌ Replace Clerk's divider "OR" text with custom string without CSS tricks
- ❌ Add the handoff's "3-button vertical stack" EXACTLY — Clerk forces email as a form not a button
- ❌ Match the hover animation (`translate(-2px,-2px) + 4px 4px 0 shadow`) perfectly — Tailwind arbitrary value classes work, but Clerk may add its own hover rules that win

**Decision:** Accept the gap. Pixel-parity chasing on Clerk's internals would require forking the component or switching to `signIn.create()` programmatic flow, both 3x the work. Document the gap in the plan (one line per unreachable detail) and proceed. UI-SPEC's "3-button stack" maps to Clerk's "Continue with Google | Continue with Apple | Continue with email" — which is what Clerk shows when the email strategy is set to email-code or email-link. [VERIFIED via Clerk dashboard options.]

### Email strategy config (Clerk dashboard)

- **User & authentication → Email, phone, username**: Enable **Email address** as identifier
- **User & authentication → Authentication strategies**: Enable **Email verification code** (simpler than magic link for cross-device flows)
- **User & authentication → Social connections**: Enable **Google** + **Apple**, configure OAuth credentials

### Server-side customization (programmatic sign-in) — REJECTED

Orchestrator raised the option. Verdict: **reject for v1**. Cost/benefit:
- 3x more code (forms, validation, error states, loading states, OAuth redirect handling)
- Duplicate effort when Clerk rolls out new strategies
- No pixel-parity win beyond what `appearance` achieves

Reconsider in v2 if handoff fidelity becomes a reported user issue.

---

## §12. Vercel deploy baseline (DEP-02)

### Required env vars (Vercel dashboard → project settings)

| Name | Env | Public | Source |
|------|-----|--------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | All | Yes | Clerk dashboard (per-env) |
| `CLERK_SECRET_KEY` | All | No | Clerk dashboard (per-env, NEVER in git) |
| `CLERK_JWT_KEY` | All | No | Clerk dashboard (optional; speeds JWT verify) |
| `NEXT_PUBLIC_SUPABASE_URL` | All | Yes | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_KEY` | All | Yes | Supabase project anon key |

### Node version pin

```json
// package.json
"engines": {
  "node": ">=20.9.0"
}
```
Vercel auto-detects and uses the closest supported LTS (Node 20.x or 22.x as of 2026). Next 16 requires Node ≥ 20.9.

### `vercel.json` (none needed)

Vercel's Next.js integration handles everything. Only add a `vercel.json` if:
- Custom rewrites/redirects beyond what Next middleware handles
- Per-route `maxDuration` tuning (not needed in Phase 1)
- Edge runtime hints (not needed; default is Node, fine for Clerk+Supabase)

### Preview deployments + Clerk (IMPORTANT)

**Problem:** Each Vercel preview URL is unique (`czfamtree-xyz.vercel.app`), but Clerk OAuth redirect URIs are statically configured. Sign-in from a preview URL will fail OAuth callback.

**Solutions:**
1. **Recommended — Clerk Preview Deployments feature:** Clerk has built-in support for Vercel preview URLs. In Clerk dashboard → Deploy → Preview deployments, enable Vercel integration. Clerk auto-adds preview URL patterns to allowed redirect URIs.
2. **Manual fallback:** Add `*.vercel.app` subdomain to Clerk's allowed URIs (less secure, still workable).
3. **Env-per-env Clerk instances:** dev / staging / prod each have separate Clerk apps; preview uses staging.

[CITED: clerk.com Preview Deployments docs — feature exists as of 2026]

### Supabase — no preview considerations needed

Single Supabase project. All envs (dev/preview/prod) hit the same DB unless you want per-env. Per-env requires duplicating migrations and is out of scope for v1. [ASSUMED: user is OK with a single shared DB for preview-and-prod — must confirm or add a staging Supabase project.]

### CI pipeline (GitHub Actions, optional for Phase 1)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit   # vitest — smoke only in Phase 1
      - run: npm run build        # Next 16 build must succeed
```

E2E tests run separately (require Clerk test tokens):
```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PK }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SK }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

### Deploy checklist (Phase 1 acceptance)

- [ ] `npm run build` succeeds locally
- [ ] Vercel project created, env vars added for Preview + Production
- [ ] Clerk dashboard: allowed redirect URIs include Vercel domain
- [ ] Supabase dashboard: Third-Party Auth → Clerk configured with Vercel-env's Clerk domain
- [ ] Migration applied to Supabase cloud project (`supabase db push`)
- [ ] First deploy: sign in from fresh browser, land on seeded tree, verify in Supabase dashboard that tree + tree_members + people rows created
- [ ] Cross-user RLS test: second user signs in, visits first user's `/tree/{id}` URL directly → sees the "This tree isn't yours to view" fallback, NOT the tree
- [ ] Sign out returns to sign-in page
- [ ] No console errors, no hydration warnings

---

## Runtime State Inventory

**N/A — greenfield phase.** Phase 1 is the first phase of a new project. No existing runtime state, no databases to migrate, no pre-existing services. Every table, every user, every deployment begins in this phase.

(This section is relevant only for rename/refactor/migration phases. Included here per the research template with explicit "not applicable" to document that the check was performed.)

---

## Code Examples

All authoritative code has been inlined in §2 (Clerk/Supabase wiring), §4 (migration SQL), §6 (bootstrap server action + RPC), §7 (tree switcher query), §10 (Tailwind setup), §11 (Clerk appearance). No separate code examples section needed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact for Phase 1 |
|--------------|------------------|--------------|---------------------|
| Clerk JWT template `supabase` | Native third-party auth integration | 2025-04-01 | MUST use native; template path is being removed |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | If using Supabase Auth. With Clerk, use neither — just `@supabase/supabase-js` |
| `auth.uid()` in RLS | `auth.jwt()->>'sub'` (for Clerk) | 2025 with native integration | ALWAYS for Clerk; `auth.uid()` silently returns NULL |
| `tailwind.config.js` + `@extend` | `@theme` block in CSS | Tailwind v4 (2024) | No config file needed; CSS-first |
| `pages/api/` for mutations | Server Actions | Next 14+ | Use server actions; `app/api/` only for webhooks |
| Next.js middleware as authz | Middleware redirects + per-action re-check | Post-CVE-2025-29927 (March 2025) | Middleware redirects unauthenticated users; every server action still calls `auth()` |
| `uuid` package for IDs | `crypto.randomUUID()` (native) or `nanoid` | Node 18+, all modern browsers | Native `randomUUID` is fine for v1; nanoid for URL-safe opaque tokens |

**Deprecated / outdated (avoid):**
- Clerk `user.id` casting to UUID — Clerk ids are TEXT, period
- `@clerk/nextjs` v5/v6 — requires Next 14/15; we are on v7
- `supabase-js` v1 — does not support `accessToken` option
- `tailwindcss@3` with `content: []` glob — Tailwind v4 auto-detects from `@import`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | User will accept `parent_ids ≤ 2` v1 limitation with "step-parent as spouse of bio-parent" workaround | §3 | Medium — if rejected, schema changes forces a Phase 1 redo; migration path to `relationships` table is documented |
| A2 | Single Supabase project shared across dev/preview/prod is acceptable | §12 | Low-medium — can add staging project later; no data is destroyed by delaying |
| A3 | Clerk's `appearance` API is sufficient for 80% pixel-parity; the 20% gap is acceptable | §11 | Low — UI-SPEC already notes "Clerk's hosted UI may resist parity"; user has accepted hosted approach |
| A4 | `10%` user threshold for migrating to `relationships` table in v2 | §3 | Low — just a placeholder number; actual decision is post-launch |
| A5 | Playwright's `request` fixture can impersonate Clerk sessions via Testing Tokens API for RLS tests in CI | §5 | Medium — if false, RLS test becomes a manual dev-env check; not blocking Phase 1 |
| A6 | `CLERK_JWT_KEY` env var is optional (speeds verify but Clerk SDK handles without it) | §2 | Low — verified against reference repo; env var is listed but not strictly required |
| A7 | No webhook infrastructure needed in Phase 1 (first-login bootstrap is RSC-driven) | §6 | Low — if we later want Clerk `user.created` hooks for server-side user mirroring, that's a separable addition |
| A8 | Single `[auth.third_party.clerk]` block in `supabase/config.toml` is sufficient for local dev | §2, §9 | Low — verified against Supabase docs |

**Table is not empty: user should confirm A1 and A3 in `/gsd-discuss-phase 1` before planning starts.**

---

## Open Questions (RESOLVED)

1. **Are we OK with single shared Supabase project for dev/preview/prod?** (A2)
   - What we know: Single-project is cheapest and simplest; migrations are one-way
   - What's unclear: Does preview deployment risk leaking test data into prod?
   - Recommendation: Accept single project for v1; add staging project if preview testing creates enough junk data to matter

2. **Does Clerk's Preview Deployments feature work with our setup as of 2026?**
   - What we know: Feature exists; auto-adds Vercel preview URLs to allowed redirect URIs
   - What's unclear: Needs a quick dev-env verification during Phase 1 planning
   - Recommendation: Manual test on first Vercel preview; fall back to `*.vercel.app` wildcard if flaky

3. **Is Clerk email verification configured for sign-in code vs magic link?**
   - What we know: UI-SPEC says "email magic links"; Clerk dashboard has both options
   - What's unclear: Which is selected
   - Recommendation: Choose **email verification code** (no new-window dance, simpler UX); flag in Phase 1 plan as a manual Clerk dashboard config step

4. **Do we need a `users` mirror table populated by Clerk webhook?**
   - What we know: We use `currentUser()` server-side to fetch display name / email / avatar
   - What's unclear: Whether we need to render other users' (invited collaborators') names server-side
   - Recommendation: No for Phase 1 (single-user); revisit in Phase 5 when share modal lists collaborators. If needed, add `app/api/webhooks/clerk/route.ts` then.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next 16 build | Assume yes | ≥20.9 required | — |
| npm | Package install | Assume yes | 10.x | — |
| Supabase CLI | Local dev + migrations | Install via `npm install -D supabase` | 2.x | — |
| Docker | Supabase CLI `supabase start` | Required for local stack | Any recent | Use Supabase cloud project directly in dev |
| Clerk dashboard access | Clerk project config | User account | — | — |
| Supabase dashboard access | Supabase project config | User account | — | — |
| Vercel account | Deploy target | User account | — | — |

**Missing dependencies with no fallback:** None — all user-account dependencies (Clerk, Supabase, Vercel) are free-tier-accessible.

**Missing dependencies with fallback:** Docker (Supabase CLI local) — fallback is cloud-only development, slower iteration but functional.

[ASSUMED: user has all three cloud accounts set up or will create them in Phase 1 planning. Plan should include "verify dashboards accessible" as first task.]

---

## Sources

### Primary (HIGH confidence)

- [Context7 `/clerk/clerk-docs`] — verified middleware, auth(), currentUser(), appearance API
- [Context7 `/supabase/supabase`] — RLS policies, third-party auth, JWT claims
- [Clerk reference repo: github.com/clerk/clerk-supabase-nextjs] — exact middleware.ts, client factory, env.local.example (fetched via raw.githubusercontent.com, 2026-04-21)
- [clerk.com/docs/integrations/databases/supabase] — setup steps, RLS pattern `auth.jwt()->>'sub'`
- [supabase.com/docs/guides/auth/third-party/clerk] — dashboard config, `supabase/config.toml`
- [clerk.com/docs/nextjs/guides/customizing-clerk/appearance-prop/variables] — exhaustive variables key list
- [supabase.com/docs/guides/realtime/authorization] — Realtime RLS on `realtime.messages` (flagged for Phase 5)

### Secondary (MEDIUM confidence)

- npm registry version verification (verified 2026-04-21): next@16.2.4, @clerk/nextjs@7.2.3, @supabase/supabase-js@2.104.0, @supabase/ssr@0.10.2, tailwindcss@4.2.4, @dagrejs/dagre@3.0.0, zod@4.3.6, @hookform/resolvers@5.2.2, react-hook-form@7.73.1, nanoid@5.1.9
- .planning/research/STACK.md (2026-04-21) — cross-verified against sources above
- .planning/research/ARCHITECTURE.md (2026-04-21) — RLS and schema sketch refined here
- .planning/research/PITFALLS.md (2026-04-21) — pitfalls #6, #7, #11, #12, #18 mapped to Phase 1

### Tertiary (LOW confidence — needs validation)

- Clerk Preview Deployments feature as-of-2026 (Open Q2) — cited but not re-verified in this session
- Exact list of `appearance.elements` keys beyond `card`, `headerTitle`, `formButtonPrimary`, `socialButtonsBlockButton` — some overrides (like `socialButtonsBlockButtonText`) extrapolated from training data; may need to be confirmed against Clerk's live docs during implementation

---

## Metadata

**Confidence breakdown:**
- Stack (§1): HIGH — every version verified live via npm
- Clerk ↔ Supabase wiring (§2): HIGH — cross-verified against official reference repo and both vendor docs
- Step-relations decision (§3): HIGH — upstream research already framed the tradeoff; this resolves it with clear v1/v2 path
- Database schema (§4): HIGH — SQL is direct extension of ARCHITECTURE.md with PITFALLS applied
- RLS (§5): HIGH — patterns sourced from Clerk + Supabase docs; recursion prevention pattern verified
- First-login bootstrap (§6): MEDIUM-HIGH — pattern is standard RSC+RPC; idempotency note flagged (A7)
- Tree switcher (§7): HIGH — one-query pattern; RLS already gates it
- Phase-1-only pitfalls (§8): HIGH — verbatim quotes from PITFALLS.md with Phase 1 mitigations
- Migrations (§9): HIGH — follows Supabase CLI conventions
- Tailwind v4 tokens (§10): HIGH — pattern verified against Tailwind v4 blog + UI-SPEC
- Clerk appearance (§11): MEDIUM — `variables` keys verified; some `elements` keys extrapolated (flagged)
- Vercel deploy (§12): HIGH — standard Next.js + Clerk + Supabase deploy; preview-deploy caveat flagged

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stack is stable, but Clerk/Supabase integration docs updated frequently; re-verify if Phase 1 planning is delayed more than a month)

---

*Phase 1 research for: CZ Family Tree — Foundation (auth + schema + RLS + first-run bootstrap + sign-in UI)*
*Researched: 2026-04-21*
