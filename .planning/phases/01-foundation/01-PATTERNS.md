# Phase 1: Foundation — Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 28 new files + 1 modified config
**Analogs found:** 11 / 29 (handoff prototype analogs); 18 flagged NEW (no analog — greenfield infra + Clerk/Supabase primitives).

> **Greenfield note:** No production `src/` exists. The handoff prototype at `design_handoff_family_tree/source/` is the only "codebase" and is NOT production code — it is a single-file React prototype (UMD globals, class-name CSS, `window.*` module linkage). The planner should:
> 1. **Adapt** handoff JSX structure and class names into TSX + Tailwind v4 utility classes (per UI-SPEC §Color and §Spacing mappings — do NOT copy `className="node"`, re-express with the Tailwind `@theme` tokens).
> 2. **Preserve** copy strings verbatim (headline, feat-tag labels, etc. — UI-SPEC §Copywriting Contract).
> 3. **Not copy** handoff state patterns (`React.useState` + `history` array + `window.FamilyModel` globals) — replaced with server actions (§RESEARCH.md §6-7) and Zustand scaffolding.
> 4. For the 18 NEW files, follow the RESEARCH.md code templates — they are verbatim reference code, not sketches.

---

## File Classification

### Configuration / Root Shell

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `package.json` | config | — | NEW — follow RESEARCH.md §1 install list | NEW |
| `tsconfig.json` | config | — | NEW — `create-next-app` default, TS 6 strict | NEW |
| `next.config.ts` | config | — | NEW — minimal, `cacheComponents: true` per RESEARCH.md | NEW |
| `.env.local.example` | config | — | NEW — exact 5 keys from RESEARCH.md §2 Step 5 | NEW |
| `middleware.ts` | middleware | request-response | NEW — verbatim `clerkMiddleware()` from RESEARCH.md §2 Step 4 | NEW |
| `app/layout.tsx` | layout/provider | request-response | NEW (partial analog: `design_handoff_family_tree/source/app.jsx` L17-51 state scaffold is the anti-pattern to avoid) | NEW |
| `app/globals.css` | config/tokens | — | **`design_handoff_family_tree/source/styles.css`** L2-21 (`:root`) + L612-705 (login) | exact |

### Supabase / Database

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `supabase/config.toml` | config | — | NEW — Supabase CLI default + `[auth.third_party.clerk]` block per RESEARCH.md §2 Step 3 | NEW |
| `supabase/migrations/20260421000000_initial_schema.sql` | migration | batch | NEW — verbatim SQL from RESEARCH.md §4 + §6 RPC | NEW |
| `supabase/seed.sql` | migration | batch | NEW — RESEARCH.md §9 | NEW |
| `lib/supabase/browser.ts` | client factory | request-response | NEW — verbatim from RESEARCH.md §2 Step 6 | NEW |
| `lib/supabase/server.ts` | client factory | request-response | NEW — verbatim from RESEARCH.md §2 Step 7 | NEW |
| `lib/supabase/types.ts` | types | — | NEW — generated via `supabase gen types` (RESEARCH.md §9) | NEW |
| `lib/auth.ts` | utility | request-response | NEW — verbatim `getUserIdOrThrow` + `getUserProfile` from RESEARCH.md §2 Step 7 + "Helper" block | NEW |

### Server Actions (mutations)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `app/actions/bootstrap.ts` | server action | CRUD | NEW — verbatim `resolveOrBootstrapTree` from RESEARCH.md §6 | NEW |
| `app/actions/trees.ts` | server action | CRUD | **`design_handoff_family_tree/source/app.jsx`** L287-302 `importFromSheet` is the closest mental-model (bulk mutation commit) though the tech differs | role-only partial |

### Auth Routes

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `app/(auth)/layout.tsx` | layout component | request-response | **`design_handoff_family_tree/source/login.jsx`** L18-26 (split 50/50, `.login-stage` grid, brand/foot rows) + L54-57 foot | exact |
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | page component | request-response | **`design_handoff_family_tree/source/login.jsx`** L32-51 (single `.google-btn` becomes Clerk `<SignIn />` stack) | role-match (button → SignIn) |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | page component | request-response | same as sign-in, with `<SignUp />` | role-match |
| `components/auth/SignInIllustration.tsx` | component | static render | **`design_handoff_family_tree/source/login.jsx`** L60-123 (entire `.login-art` SVG) | exact — copy verbatim |

### App Shell / Topbar (authenticated)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `app/(app)/layout.tsx` | layout component | request-response | **`design_handoff_family_tree/source/app.jsx`** L347-378 (topbar) + L380-449 (canvas region wrapper) — keep only brand + tree-title + avatar for Phase 1 | role-match (subset) |
| `app/(app)/tree/[treeId]/page.tsx` | page (RSC) | request-response | NEW — reads tree + seed person via server Supabase client | NEW |
| `app/page.tsx` | page (RSC, redirect) | request-response | NEW — calls `resolveOrBootstrapTree` + `redirect()` per RESEARCH.md §6 | NEW |
| `components/shell/TopBar.tsx` | component | client-interactive | **`design_handoff_family_tree/source/app.jsx`** L347-378 | exact (subset — no Share/Sheet/Presence) |
| `components/shell/BrandMark.tsx` | component | static render | **`design_handoff_family_tree/source/app.jsx`** L348-351 (topbar mark) + **`login.jsx`** L21-24 (login mark) + **`styles.css`** L296-304 / L639-647 | exact |
| `components/shell/TreeTitle.tsx` | component | client-interactive (rename) | **`design_handoff_family_tree/source/app.jsx`** L352-357 (display) + **`components.jsx`** L170-171 (inline `.field-input` for editing) | role-match (composed) |
| `components/shell/TreeSwitcher.tsx` | component | client-interactive (dropdown + mutation) | NEW — no dropdown analog in handoff; derive Swiss-card styling from `styles.css` L417-424 (`.modal`) and `.tweaks-panel` L489-510 | NEW (styling analog only) |
| `components/shell/UserMenu.tsx` | component | client-interactive (dropdown) | NEW — derive Swiss-card styling same as TreeSwitcher | NEW (styling analog only) |
| `components/shell/Avatar.tsx` | component | static render | **`design_handoff_family_tree/source/app.jsx`** L377 (topbar) + L363-365 (`.presence-avatar`) + **`styles.css`** L466-476 (`.invite-avatar`) | exact |
| `components/shell/GridBackground.tsx` | component | static render | **`design_handoff_family_tree/source/styles.css`** L59-64 (`.grid-bg`) | exact (CSS-only) |
| `components/shell/SeedPersonNode.tsx` | component | static render | **`design_handoff_family_tree/source/components.jsx`** L11-72 (`PersonNode`) — Phase 1 strips drag, radial-button, relation-label; keeps card + `.is-me` ribbon | role-match (subset) |
| `components/shell/EmptyTreeOverlay.tsx` | component | static render | **`design_handoff_family_tree/source/app.jsx`** L440-448 (`.empty-state` + `.empty-card`) + **`styles.css`** L716-732 | exact |
| `components/shell/AuthError.tsx` | component | static render | NEW — copy from UI-SPEC §Error states; derive card styling from `.empty-card` | partial (styling only) |

### Tests

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `tests/rls.spec.ts` | test (integration) | batch | NEW — RESEARCH.md §5 "Testing RLS" checklist | NEW |
| `e2e/signin-bootstrap.spec.ts` | test (E2E) | request-response | NEW — RESEARCH.md §12 "Deploy checklist" | NEW |
| `vitest.config.ts` | config | — | NEW — @vitejs/plugin-react + jsdom | NEW |
| `playwright.config.ts` | config | — | NEW — chromium-only for Phase 1 | NEW |

---

## Pattern Assignments

> All code paths below the `### File:` headers are **absolute file paths**. Excerpts quote handoff source verbatim; Phase 1 implementation should adapt class names to Tailwind utility equivalents while preserving structure, dimensions, and copy.

---

### File: `app/globals.css` (config/tokens)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/styles.css`

**`:root` token pattern** (styles.css L2-21) — copy these CSS custom properties verbatim into `@theme` block (per UI-SPEC §Color):

```css
:root {
  --bg: oklch(0.985 0.003 80);
  --bg-soft: oklch(0.965 0.004 80);
  --bg-card: oklch(1 0 0);
  --ink: oklch(0.18 0.008 80);
  --ink-2: oklch(0.38 0.006 80);
  --ink-3: oklch(0.62 0.006 80);
  --rule: oklch(0.88 0.005 80);
  --rule-soft: oklch(0.93 0.004 80);
  --accent: oklch(0.52 0.14 250);
  --accent-soft: oklch(0.94 0.03 250);
  --danger: oklch(0.55 0.17 25);
  --success: oklch(0.62 0.13 150);
  --warning: oklch(0.72 0.14 75);

  --sans: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  --grid-size: 24px;
}
```

**Global body rules** (styles.css L25-34) — keep `font-feature-settings`, drop `overflow: hidden; height: 100vh` (Phase 1 still needs auth/scroll):

```css
html, body {
  font-family: var(--sans);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  font-feature-settings: 'ss01', 'cv11';
}
```

**Grid background** (styles.css L59-64) — reuse as `.grid-bg` utility OR Tailwind plugin:

```css
.grid-bg {
  background-image:
    linear-gradient(to right, var(--rule-soft) 1px, transparent 1px),
    linear-gradient(to bottom, var(--rule-soft) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
}
```

**Focus-visible** (styles.css L742-745) — keep identical; UI-SPEC §Accessibility mandates:

```css
button:focus-visible, input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

**Override** the full `@theme` block template from **RESEARCH.md §10** (Tailwind v4 setup). That template maps every `:root` var into `--color-*` and `--spacing-*` tokens. Use that block verbatim.

---

### File: `app/layout.tsx` (layout/provider)

**Analog:** NONE (greenfield — Clerk+Next 16 entry).

**Template:** RESEARCH.md §10 "`app/layout.tsx`" block is the verbatim reference:

```tsx
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-jetbrains-mono' });

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

**Font weights** must be exactly `['400', '600']` (UI-SPEC §Typography dropped weight 500). JetBrains Mono is 400-only.

---

### File: `middleware.ts` (middleware)

**Analog:** NONE — verbatim from Clerk reference repo (RESEARCH.md §2 Step 4):

```ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

**Critical:** file lives at repository root (NOT inside `app/` or `src/`) per RESEARCH.md §8 Pitfall 1-3. Import from `@clerk/nextjs/server` (NOT `@clerk/nextjs`).

---

### File: `lib/supabase/browser.ts` (client factory)

**Analog:** NONE — verbatim from RESEARCH.md §2 Step 6:

```tsx
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
          async accessToken() { return session?.getToken() ?? null; },
        }
      ),
    [session]
  );
}
```

**Critical:** env var name is `NEXT_PUBLIC_SUPABASE_KEY` (not `_ANON_KEY`) per RESEARCH.md §2 "Naming gotcha". Use `useSession` (not `useAuth`) to match Clerk reference repo.

---

### File: `lib/supabase/server.ts` (client factory)

**Analog:** NONE — verbatim from RESEARCH.md §2 Step 7:

```ts
import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      async accessToken() { return (await auth()).getToken(); },
    }
  );
}
```

Add `Database` generic after running `supabase gen types typescript --local > lib/supabase/types.ts`.

---

### File: `lib/auth.ts` (utility)

**Analog:** NONE — verbatim from RESEARCH.md §2 "Helper":

```ts
import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';

export type ClerkUserId = string & { __brand: 'ClerkUserId' };

export async function getUserIdOrThrow(): Promise<ClerkUserId> {
  const { userId } = await auth();
  if (!userId) throw new Error('UNAUTHENTICATED');
  return userId as ClerkUserId;
}

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

**Critical** (RESEARCH.md §8 Pitfall 1-4): `getUserProfile()` MUST project to a plain object — never pass Clerk's raw `currentUser()` across server/client boundary. Consumers of the profile (e.g. `<UserMenu>`) type their prop as `{ displayName; email; avatarUrl }` — NOT `User`.

---

### File: `supabase/migrations/20260421000000_initial_schema.sql` (migration)

**Analog:** NONE.

**Template:** RESEARCH.md §4 "Migration file structure" (the full `begin; ... commit;` block, L411-703) is the verbatim reference. Append the `bootstrap_tree` RPC from RESEARCH.md §6 "Supporting Postgres RPC" block (L898-936).

**Lint gate:** CI must grep for `auth.uid()` and fail (RESEARCH.md §8 Pitfall 1-2). Every RLS policy uses `(select auth.jwt()->>'sub')`.

**Helper requirement:** `user_tree_ids(uid text)` SECURITY DEFINER function breaks the RLS recursion (RESEARCH.md §8 Pitfall 1-1).

---

### File: `app/actions/bootstrap.ts` (server action)

**Analog:** NONE — verbatim from RESEARCH.md §6:

```ts
'use server';
import { getUserIdOrThrow, getUserProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export async function resolveOrBootstrapTree(): Promise<string> {
  const userId = await getUserIdOrThrow();
  const supabase = await supabaseServer();

  const { data: memberships } = await supabase
    .from('tree_members')
    .select('tree_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (memberships && memberships.length > 0) return memberships[0].tree_id;

  const profile = await getUserProfile();
  const { data, error } = await supabase.rpc('bootstrap_tree', {
    p_owner_user_id: userId,
    p_tree_name: 'My family tree',
    p_seed_person_name: profile?.displayName ?? 'You',
  });
  if (error || !data) throw new Error(`Failed to bootstrap tree: ${error?.message ?? 'unknown'}`);
  return data as string;
}
```

**Pattern:** every server action calls `getUserIdOrThrow()` FIRST — defense-in-depth re-check over middleware (RESEARCH.md §8 Pitfall 1-6).

---

### File: `app/actions/trees.ts` (server actions: list + create + rename)

**Analog (partial):** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/app.jsx` L266-270 `updatePerson` shows the "patch function" mental model (though client-state, not server). The shape translates: `(id, patch) => ...`.

**Template:** RESEARCH.md §7 listing + create + rename:

```ts
'use server';
import { getUserIdOrThrow } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export type TreeListItem = {
  id: string; name: string; ownerUserId: string;
  role: 'owner' | 'editor' | 'viewer';
  memberCount: number; updatedAt: string;
};

export async function listMyTrees(): Promise<TreeListItem[]> {
  const userId = await getUserIdOrThrow();
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('tree_members')
    .select(`role, tree:trees!inner(id, name, owner_user_id, updated_at)`)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { foreignTable: 'trees', ascending: false });
  if (error) throw new Error(`listMyTrees failed: ${error.message}`);
  if (!data) return [];
  return data.map((row: any) => ({
    id: row.tree.id, name: row.tree.name, ownerUserId: row.tree.owner_user_id,
    role: row.role, memberCount: 0, updatedAt: row.tree.updated_at,
  }));
}

export async function createNewTree(name = 'Untitled tree'): Promise<string> { /* rpc call */ }
export async function renameTree(treeId: string, name: string): Promise<void> { /* update with trim+slice */ }
```

**Pattern applied across all three:** `getUserIdOrThrow()` → `supabaseServer()` → RLS-gated query → throw on error. `renameTree` trims + `.slice(0, 80)` + silent-return on empty per UI-SPEC §Inline tree rename.

---

### File: `app/(auth)/layout.tsx` (layout component)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/login.jsx`

**Split layout pattern** (login.jsx L18-26, styles.css L612-625):

```jsx
// login.jsx L18-26 — the outer shell
<div className="login-stage">
  <div className="login-side">
    <div className="login-brand">
      <div className="login-brand-mark">CZ</div>
      <span>Family Tree</span>
    </div>
    {/* ... */}
```

```css
/* styles.css L612-625 — the split */
.login-stage {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--bg);
}
.login-side {
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-right: 1px solid var(--rule);
}
.login-art {
  position: relative;
  background: var(--bg-soft);
  overflow: hidden;
}
```

**Headline + sub pattern** (login.jsx L27-30):

```jsx
<h1 className="login-headline">Every name, a branch.<br/>Every branch, a story.</h1>
<p className="login-sub">
  Build your family tree by clicking, dragging, and connecting &mdash; or sync it from a Google Sheet. Invite relatives to collaborate in real time.
</p>
```

> **Copy modification per UI-SPEC §Copywriting:** Drop the "sync it from a Google Sheet" clause → `Build your family tree by clicking, dragging, and connecting — or invite relatives to collaborate in real time.` Sheets sync is v2-deferred.

**Foot pattern** (login.jsx L54-57, styles.css L678-686):

```jsx
<div className="login-foot">
  <span>v0.1 · preview</span>
  <span>Private by default</span>
</div>
```

**Adaptation:** Port `.login-stage` → `grid grid-cols-2` Tailwind. Port `.login-side` padding `48px` → `p-4xl` (spacing token). Replace prototype's sibling structure (brand / content / foot within one `<div>`) with the RESEARCH.md §11 "Layout wrapper (split 50/50 per UI-SPEC)" verbatim `AuthLayout` TSX block — it already converts the handoff to Tailwind v4 utility classes.

---

### File: `app/(auth)/sign-in/[[...sign-in]]/page.tsx` (page component)

**Analog (role-match):** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/login.jsx` L32-44 shows the single handoff button; Phase 1 replaces with Clerk `<SignIn />` via RESEARCH.md §11 `appearance` prop template.

**Single-button pattern** (login.jsx L32-44) — this IS the visual target that Clerk `<SignIn />` `socialButtonsBlockButton` must match:

```jsx
<button className="google-btn" onClick={handleSignIn} disabled={loading}>
  {loading ? (
    <>
      <div style={{width:18,height:18,border:'2px solid var(--ink)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      <span>Signing in&hellip;</span>
    </>
  ) : (
    <>
      <window.Icons.Google size={18}/>
      <span>Continue with Google</span>
    </>
  )}
</button>
```

**`.google-btn` CSS** (styles.css L663-677) — the hover-translate + hard-shadow pattern to propagate to every provider button:

```css
.google-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--bg-card);
  border: 1px solid var(--ink);
  font-size: 14px;
  font-weight: 500;
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}
.google-btn:hover {
  box-shadow: 4px 4px 0 var(--ink);
  transform: translate(-2px, -2px);
}
```

**Template:** RESEARCH.md §11 Clerk `<SignIn />` with `appearance.variables` + `appearance.elements` block is the verbatim implementation. The `socialButtonsBlockButton` class string in that block replicates the `.google-btn` hover effect via Tailwind arbitrary values.

> Note per UI-SPEC: padding is `8px 14px` (per `.btn`) — RESEARCH.md §11 uses `py-sm px-[14px]`. This differs from handoff's `.google-btn` padding `12px 20px`. **UI-SPEC §Spacing "Component Constants" locks 8×14 for sign-in provider buttons** — follow UI-SPEC, not handoff.

---

### File: `components/auth/SignInIllustration.tsx` (component)

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/login.jsx` L60-123 — **copy SVG verbatim, adapt copy**.

**Full pattern** (login.jsx L60-123):

```jsx
<div className="login-art grid-bg">
  <div className="login-mini-tree">
    <svg viewBox="0 0 400 400" width="80%" style={{maxWidth: 460}}>
      <defs>
        <pattern id="dots" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="oklch(0.62 0.006 80)"/>
        </pattern>
      </defs>

      {/* Edges */}
      <g stroke="oklch(0.18 0.008 80)" strokeWidth="1.5" fill="none">
        <path d="M 120 120 L 280 120"/>
        <path d="M 200 120 L 200 200 L 120 200 L 120 270"/>
        <path d="M 200 200 L 280 200 L 280 270"/>
      </g>

      {/* Top row: grandparents (stylized) */}
      <g>
        <rect x="60" y="60" width="120" height="60" fill="oklch(1 0 0)" stroke="oklch(0.18 0.008 80)" strokeWidth="1.5"/>
        <rect x="60" y="60" width="60" height="60" fill="url(#dots)"/>
        <text x="130" y="85" fontFamily="Inter" fontSize="11" fontWeight="600" fill="oklch(0.18 0.008 80)">Dave</text>
        <text x="130" y="100" fontFamily="JetBrains Mono" fontSize="9" fill="oklch(0.38 0.006 80)">1981 –</text>

        <rect x="220" y="60" width="120" height="60" fill="oklch(1 0 0)" stroke="oklch(0.18 0.008 80)" strokeWidth="1.5"/>
        <rect x="220" y="60" width="60" height="60" fill="url(#dots)"/>
        <text x="290" y="85" fontFamily="Inter" fontSize="11" fontWeight="600" fill="oklch(0.18 0.008 80)">Katherine</text>
        <text x="290" y="100" fontFamily="JetBrains Mono" fontSize="9" fill="oklch(0.38 0.006 80)">1981 –</text>
      </g>

      <path d="M 180 90 L 220 90" stroke="oklch(0.52 0.14 250)" strokeWidth="2" fill="none"/>

      <g>
        <rect x="140" y="270" width="120" height="60" fill="oklch(1 0 0)" stroke="oklch(0.18 0.008 80)" strokeWidth="2"/>
        <rect x="140" y="270" width="60" height="60" fill="url(#dots)"/>
        <text x="210" y="295" fontFamily="Inter" fontSize="11" fontWeight="600" fill="oklch(0.18 0.008 80)">Olivia</text>
        <text x="210" y="310" fontFamily="JetBrains Mono" fontSize="9" fill="oklch(0.38 0.006 80)">2012 –</text>
      </g>

      <text x="60" y="40" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="1" fill="oklch(0.38 0.006 80)">GEN 01 · PARENTS</text>
      <text x="60" y="250" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="1" fill="oklch(0.38 0.006 80)">GEN 02 · CHILDREN</text>

      <text x="370" y="390" fontFamily="JetBrains Mono" fontSize="9" textAnchor="end" fill="oklch(0.62 0.006 80)">fig. 01 — the Chan-Zabihaylo family</text>
    </svg>
  </div>
</div>
```

**Presence indicator** (login.jsx L113-122) — static decorative, verbatim:

```jsx
<div style={{
  position: 'absolute', top: 40, right: 40,
  display: 'flex', alignItems: 'center', gap: 6,
  fontFamily: 'var(--mono)', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--ink-2)',
}}>
  <span style={{width: 6, height: 6, background: 'oklch(0.62 0.13 150)', borderRadius: '50%'}}/>
  3 editors online
</div>
```

**Adaptation:** TSX conversion + Tailwind inline styles where possible. All `fill` / `stroke` values stay OKLCH literal (not token lookups) to guarantee SVG renders correctly without Tailwind theme resolution at paint time.

---

### File: `app/(app)/layout.tsx` + `components/shell/TopBar.tsx`

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/app.jsx` L347-378 (topbar) — **subset only** (Phase 1 has NO Share, Sheet sync, presence stack; 1 avatar not 3).

**Topbar pattern** (app.jsx L347-378):

```jsx
{/* Topbar */}
<div className="topbar">
  <div className="topbar-brand">
    <div className="topbar-brand-mark">CZ</div>
    <span>Family Tree</span>
  </div>
  <div className="topbar-title">
    <strong>Chan-Zabihaylo Family Tree</strong>
    <span style={{fontFamily: 'var(--mono)', fontSize: 11, marginLeft: 8, color: 'var(--ink-3)'}}>
      · {people.length} people
    </span>
  </div>

  <div className="topbar-spacer"/>

  {/* Presence — REMOVE in Phase 1 */}
  <div className="presence" title="3 collaborators online">...</div>

  {/* Buttons — REMOVE Sheet sync + Share in Phase 1 */}
  <button className="btn btn-sm" onClick={...}>...</button>
  <button className="btn btn-primary btn-sm" onClick={...}>...</button>

  <div style={{width: 1, height: 24, background: 'var(--rule)'}}/>

  <div className="invite-avatar" title={user.email} style={{background: 'var(--ink)'}}>{user.avatar}</div>
</div>
```

**Topbar CSS** (styles.css L276-312):

```css
.topbar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 52px;
  background: var(--bg);
  border-bottom: 1px solid var(--rule);
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 50;
  gap: 16px;
}
.topbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;  /* NOTE: handoff uses 10px; UI-SPEC spec locks 12px (md token). Use UI-SPEC. */
  font-weight: 600;
  font-size: 14px;
  letter-spacing: -0.01em;
}
.topbar-brand-mark {
  width: 20px; height: 20px;
  background: var(--ink);
  display: grid;
  place-items: center;
  color: var(--bg);
  font-family: var(--mono);
  font-size: 11px;
}
.topbar-title {
  border-left: 1px solid var(--rule);
  padding-left: 16px;
  font-size: 13px;
  color: var(--ink-2);
}
.topbar-title strong { color: var(--ink); font-weight: 600; }
```

**Adaptation:**
- **Phase 1 strips:** `.presence` block, `Sheet sync` button, `Share` button. Divider before avatar stays.
- **Per UI-SPEC §Topbar:** replace hard-coded title string with `<TreeTitle>` + chevron `<TreeSwitcher>`, avatar becomes `<UserMenu>` trigger.
- **Tailwind port:** `.topbar` → `sticky top-0 h-[52px] bg-bg border-b border-rule flex items-center px-lg gap-lg z-50`. Port remaining classes similarly.
- **Resolve discrepancy:** Handoff is 52px (styles.css L279); REQUIREMENTS.md PANEL-02 said 56px. **UI-SPEC lock is 52px** per DESIGN-03 pixel-parity mandate.

---

### File: `components/shell/BrandMark.tsx`

**Analog:** two instances in handoff — 20px topbar and 28px login.

**Topbar variant** (app.jsx L348-351 + styles.css L296-304):
```jsx
<div className="topbar-brand-mark">CZ</div>
```
```css
.topbar-brand-mark { width: 20px; height: 20px; background: var(--ink); display: grid; place-items: center; color: var(--bg); font-family: var(--mono); font-size: 11px; }
```

**Login variant** (login.jsx L22 + styles.css L639-647):
```jsx
<div className="login-brand-mark">CZ</div>
```
```css
.login-brand-mark { width: 28px; height: 28px; background: var(--ink); color: var(--bg); display: grid; place-items: center; font-family: var(--mono); font-size: 13px; }
```

**Adaptation:** single component with `size?: 'sm' | 'lg'` prop (20 vs 28px). Literal `CZ` glyph. Tailwind: `grid place-items-center bg-ink text-bg-card font-mono`; size-specific classes conditionally.

---

### File: `components/shell/TreeTitle.tsx`

**Analog (display):** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/app.jsx` L352-357:

```jsx
<div className="topbar-title">
  <strong>Chan-Zabihaylo Family Tree</strong>
  <span style={{fontFamily: 'var(--mono)', fontSize: 11, marginLeft: 8, color: 'var(--ink-3)'}}>
    · {people.length} people
  </span>
</div>
```

**Analog (rename input):** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/components.jsx` L170-171:

```jsx
<input className="field-input" value={person.name} onChange={e => upd({name: e.target.value})}/>
```

**`.field-input` CSS** (styles.css L117-124):

```css
.field-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--rule);
  background: var(--bg-card);
  font-size: 14px;
}
.field-input:focus { border-color: var(--accent); }
```

**Adaptation:** Two-mode component — display mode (span with strong + mono meta) and edit mode (input with `maxLength={80}`, autofocus, Enter-commit, Escape-abort, blur-commit) per UI-SPEC §Inline tree rename. Server commit via `renameTree(treeId, name)` server action. Optimistic local update; silent revert on error (no toast infra in Phase 1).

**Singular vs plural meta** (UI-SPEC copy): `· 1 person` vs `· N people`. Handoff used always-plural `people`.

---

### File: `components/shell/Avatar.tsx`

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/app.jsx` L363-365 and L377:

```jsx
{/* Presence avatars (28px) */}
<div className="presence-avatar" style={{background: 'oklch(0.52 0.14 250)'}}>DZ</div>
<div className="presence-avatar" style={{background: 'oklch(0.62 0.13 150)'}}>KC</div>
<div className="presence-avatar" style={{background: 'oklch(0.72 0.14 75)'}}>MC</div>

{/* Trigger avatar (32px) */}
<div className="invite-avatar" title={user.email} style={{background: 'var(--ink)'}}>{user.avatar}</div>
```

**`.invite-avatar` CSS** (styles.css L466-476) — 32×32:

```css
.invite-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--ink-3);
  color: white;
  display: grid;
  place-items: center;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
}
```

**`.presence-avatar` CSS** (styles.css L318-330) — 28×28 with stack inset:

```css
.presence-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--ink-3);
  border: 2px solid var(--bg);
  margin-left: -6px;
  display: grid;
  place-items: center;
  color: white;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
}
```

**Adaptation:** `<Avatar size={32|28} initials={string} bgColor={oklchString} />`. Deterministic `bgColor` via `hash(userId) % palette` where palette = `['oklch(0.52 0.14 250)', 'oklch(0.62 0.13 150)', 'oklch(0.72 0.14 75)', 'oklch(0.70 0.10 300)']` per UI-SPEC §Open Questions #3.

---

### File: `components/shell/SeedPersonNode.tsx`

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/components.jsx` L5-72 `PersonNode` — **strip ~75% of interactivity**.

**Keep from PersonNode** (L11-46): the card container structure, photo slot (optional — can skip in Phase 1 since seed node has no photo), name, years slot, `.is-me` ribbon via CSS `::before`.

**Strip from PersonNode:**
- `onStartDrag`, `onSelect`, `onDoubleClick` handlers → Phase 1 seed is non-interactive
- `selected` state / `.selected` class + accent ring → no selection in Phase 1
- `onOpenRadial` add button → radial is Phase 3
- `relation` label → no root concept yet

**`.node` + `.node.is-me` CSS** (styles.css L142-218):

```css
.node {
  position: absolute;
  width: 168px;
  background: var(--bg-card);
  border: 1px solid var(--ink);
  display: flex;
  flex-direction: column;
  cursor: grab;              /* Phase 1: change to `default` */
  user-select: none;
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}
.node:hover { box-shadow: 4px 4px 0 var(--ink); }   /* Phase 1: drop hover */
.node-body { padding: 10px 12px 12px; }
.node-name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin-bottom: 4px;
}
.node-years {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-2);
}
.node.is-me { border-width: 2px; }
.node.is-me::before {
  content: 'YOU';
  position: absolute;
  top: -1px; right: -1px;
  background: var(--ink);
  color: var(--bg);
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  padding: 2px 6px;
  z-index: 2;
}
```

**Adaptation:** positioned at `(0,0)` in the canvas-inner coordinate system. No drag/selection. Static `YOU` ribbon via `::before` pseudo-element. Person name is the seed name (`profile?.displayName ?? 'You'`). Year line is blank in Phase 1.

---

### File: `components/shell/EmptyTreeOverlay.tsx`

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/app.jsx` L440-448:

```jsx
{people.length === 1 && (
  <div className="empty-state">
    <div className="empty-card">
      <div style={{fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8}}>Getting started</div>
      <div style={{fontSize: 15, fontWeight: 500, marginBottom: 8}}>Click your card to add relatives</div>
      <div style={{fontSize: 13, color: 'var(--ink-2)'}}>Or <button className="btn btn-sm" style={{display: 'inline-flex'}} onClick={() => setShowSheet(true)}>import from a sheet</button></div>
    </div>
  </div>
)}
```

**`.empty-card` CSS** (styles.css L716-732):

```css
.empty-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 10;
}
.empty-card {
  background: var(--bg-card);
  border: 1px solid var(--ink);
  padding: 24px 32px;
  text-align: center;
  pointer-events: auto;
  box-shadow: 4px 4px 0 var(--ink);
  max-width: 360px;
}
```

**Adaptation per UI-SPEC §Copywriting:**
- Label: `GETTING STARTED` (mono caps)
- Heading: `Your tree is ready.` (promote to 600 weight per UI-SPEC typography — handoff used 500)
- Body: `Click your card to start adding relatives — or stay here and get your bearings.`
- **Remove** the "import from a sheet" button (Sheets sync is v2-deferred)
- Render only when `people.length === 1` (same guard as handoff)

---

### File: `components/shell/GridBackground.tsx`

**Analog:** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/app.jsx` L383 `className="canvas-wrap grid-bg"` applies the class; styling is CSS-only (styles.css L59-64 — already extracted above).

**Adaptation:** thin wrapper `<div className="grid-bg absolute inset-0">` OR inline the `backgroundImage` on the canvas container. Phase 1 renders the grid statically with `transform: translate(0,0) scale(1)` — no pan/zoom (Phase 2 adds that, per UI-SPEC Phase 1 scope).

---

### File: `components/shell/TreeSwitcher.tsx`

**Analog (styling only):** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/styles.css` L489-510 (`.tweaks-panel` — closest Swiss-card dropdown pattern in handoff):

```css
.tweaks-panel {
  position: absolute;
  right: 20px;
  bottom: 80px;
  width: 240px;
  background: var(--bg-card);
  border: 1px solid var(--ink);
  z-index: 60;
  box-shadow: 4px 4px 0 var(--ink);
  font-size: 12px;
}
.tweaks-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--rule);
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-2);
  display: flex;
  justify-content: space-between;
}
```

**Modal styling pattern** (styles.css L417-424) — also valid for dropdown card shadow:

```css
.modal {
  background: var(--bg-card);
  border: 1px solid var(--ink);
  box-shadow: 8px 8px 0 var(--ink);
  animation: popIn 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.1);
}
```

**Adaptation per UI-SPEC §Tree switcher dropdown:**
- 280px wide (not 240 handoff) — anchored under chevron, 4px below topbar
- Shadow: `4px 4px 0 var(--ink)` (tweaks-panel value, NOT modal 8×8)
- Section headers: `YOUR TREES`, `SHARED WITH YOU` — mono 11px caps `--ink-3`, 0.12em tracking
- Row hover: `bg-bg-soft`; active tree gets 4px left-border `--accent` accent
- Action: `+ New tree` with lucide `Plus` icon → calls `createNewTree()` server action
- Close triggers: outside click (portal backdrop), Escape, item selection

**Data source:** `listMyTrees()` from `app/actions/trees.ts`; client-side split by `role === 'owner'`.

---

### File: `components/shell/UserMenu.tsx`

**Analog (styling only):** same Swiss-card dropdown pattern as TreeSwitcher (styles.css `.tweaks-panel` + `.modal`).

**Adaptation per UI-SPEC §User menu dropdown:**
- 240px wide, right-aligned to 32px avatar
- Header row (non-clickable, 12×16px): `{displayName}` (Inter 13px 600) + `{email}` (mono 11px `--ink-3`), 1px `--rule-soft` bottom divider
- Action row: `Sign out` + lucide `LogOut` icon 14px. Click → Clerk `signOut()` → navigate to `/sign-in`
- No confirmation dialog (per UI-SPEC §Destructive: Sign out)

**Clerk signOut API** (RESEARCH.md §2): use `useClerk().signOut({ redirectUrl: '/sign-in' })` in client component.

---

### File: `components/shell/AuthError.tsx`

**Analog (styling only):** `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/styles.css` L716-732 `.empty-card` — derives "full-screen fallback card" styling.

**Adaptation per UI-SPEC §Error states:**
- Full-screen container (absolute inset-0, grid place-items-center, bg `--bg`)
- Card: `border border-ink shadow-[4px_4px_0_var(--ink)] p-[24px_32px] max-w-[360px] text-center`
- Two variants:
  - **Bootstrap failure:** heading `We couldn't set up your tree.`, body `Something went wrong on our side. Try again, and if it keeps happening, ping support.`, CTA `Try again` (refresh)
  - **RLS reject:** heading `This tree isn't yours to view.`, body `It may have been unshared, or the link might be wrong.`, CTA `Go to your tree` (redirect `/`)

---

## Shared Patterns

### Auth guard (server-side)

**Source:** `lib/auth.ts` `getUserIdOrThrow()`
**Apply to:** Every server action file, every RSC that reads auth-dependent data

**Usage pattern:**
```ts
'use server';
import { getUserIdOrThrow } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export async function anyAction(...) {
  const userId = await getUserIdOrThrow();     // ALWAYS FIRST
  const supabase = await supabaseServer();
  // ... RLS-gated query with userId available
}
```

**Rationale:** defense-in-depth against CVE-2025-29927 (RESEARCH.md §8 Pitfall 1-6). Middleware redirects unauthenticated; every server action re-validates.

---

### Swiss-card container

**Source:** `design_handoff_family_tree/source/styles.css` L417-424 (`.modal`) / L489-497 (`.tweaks-panel`) / L724-732 (`.empty-card`)

**Apply to:** TreeSwitcher dropdown, UserMenu dropdown, AuthError fallback, (Phase 3+: Share modal, Toast)

**Verbatim CSS pattern:**
```css
{
  background: var(--bg-card);        /* = bg-card Tailwind token */
  border: 1px solid var(--ink);       /* = border-ink */
  box-shadow: 4px 4px 0 var(--ink);   /* Tailwind arbitrary: shadow-[4px_4px_0_var(--ink)] */
  /* radius: 0 (Swiss — never use rounded-*) */
}
```

**Tailwind expression:** `bg-bg-card border border-ink shadow-[4px_4px_0_var(--ink)]` (no radius class).

---

### Mono-caps section header

**Source:** `design_handoff_family_tree/source/styles.css` L108-116 (`.field-label`) / L443 (`.empty-state` inline) / L500-510 (`.tweaks-header`)

**Apply to:** TreeSwitcher section headers (`YOUR TREES`, `SHARED WITH YOU`), UserMenu never (no section in 1-row menu), EmptyTreeOverlay label (`GETTING STARTED`)

**Verbatim CSS pattern:**
```css
{
  font-family: var(--mono);
  font-size: 11px;                    /* UI-SPEC unified to 11px; handoff mixed 10/11 */
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-3);
}
```

**Tailwind expression:** `font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3`.

---

### Hover translate + hard shadow (primary CTA)

**Source:** `design_handoff_family_tree/source/styles.css` L663-677 (`.google-btn`) + L153-155 (`.node:hover`)

**Apply to:** Sign-in provider buttons (via Clerk `appearance.elements.socialButtonsBlockButton`), (Phase 2+: `Add relative` buttons, future CTAs)

**Verbatim CSS pattern:**
```css
.google-btn {
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}
.google-btn:hover {
  box-shadow: 4px 4px 0 var(--ink);
  transform: translate(-2px, -2px);
}
```

**Tailwind expression:** `transition-all duration-150 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_var(--ink)]`.

---

### Client-side outside-click + escape close

**Source:** `design_handoff_family_tree/source/components.jsx` L86-97 (RadialMenu close handlers):

```jsx
React.useEffect(() => {
  const onKey = (e) => { if (e.key === 'Escape') onClose(); };
  const onClick = (e) => {
    if (!e.target.closest('.radial')) onClose();
  };
  window.addEventListener('keydown', onKey);
  setTimeout(() => window.addEventListener('mousedown', onClick), 10);
  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('mousedown', onClick);
  };
}, [onClose]);
```

**Apply to:** TreeSwitcher dropdown, UserMenu dropdown, (Phase 3+: any popover/modal that lacks a Radix primitive)

**Critical pattern:** the `setTimeout(..., 10)` on the mousedown handler prevents the opening click from immediately closing the dropdown. Preserve this trick.

**Adaptation:** replace `'.radial'` class selector with ref-based check (`containerRef.current?.contains(e.target)` → negated). Return focus to trigger on close (UI-SPEC §Keyboard interaction matrix).

---

### RLS-gated server query

**Source:** RESEARCH.md §7 `listMyTrees`

**Apply to:** All server actions that READ tenant-scoped data (trees, tree_members, people, invites — Phase 1 touches the first two)

**Pattern:**
```ts
const userId = await getUserIdOrThrow();
const supabase = await supabaseServer();
const { data, error } = await supabase.from('<table>').select(...).eq('<col>', userId);
if (error) throw new Error(`<action> failed: ${error.message}`);
```

RLS does the authorization — no `WHERE user_id = <x>` needed for security (it's for performance/intent only). `auth.jwt()->>'sub'` inside policies is the security boundary.

---

### Typography scale (from UI-SPEC §Typography)

**Apply to:** ALL components (replaces handoff's 6-size scale).

| Role | Size | Weight | LH | Use |
|------|------|--------|----|-----|
| Display | 48px | 600 | 1.05 | `.login-headline` only |
| Body | 14px | 400 | 1.5 | All body text (promoted from handoff's 15px `.login-sub`) |
| Label | 13px | 600 | 1.3 | Buttons, tree title strong, switcher items (promoted from handoff's 500) |
| Mono micro | 11px | 400 | 1.2 | All mono uppercase labels (unified from handoff's 9/10/11 mix) |

Letter-spacing: display `-0.025em`, body `-0.005em`, label `-0.005em`, mono caps `+0.12em`.

---

## No Analog Found

Files entirely new with no handoff reference. Planner MUST use RESEARCH.md templates verbatim for these:

| File | Role | Data Flow | Template Source |
|------|------|-----------|-----------------|
| `package.json` | config | — | RESEARCH.md §1 install commands |
| `tsconfig.json` | config | — | `create-next-app` default (TS 6 strict) |
| `next.config.ts` | config | — | Default + `experimental.cacheComponents: true` (RESEARCH.md §0 CLAUDE.md note) |
| `.env.local.example` | config | — | RESEARCH.md §2 Step 5 table |
| `middleware.ts` | middleware | request-response | RESEARCH.md §2 Step 4 verbatim |
| `supabase/config.toml` | config | — | RESEARCH.md §2 Step 3 (`[auth.third_party.clerk]`) |
| `supabase/migrations/20260421000000_initial_schema.sql` | migration | batch | RESEARCH.md §4 full migration + §6 RPC appended |
| `supabase/seed.sql` | migration | batch | RESEARCH.md §9 "Seed data" block |
| `lib/supabase/browser.ts` | client factory | request-response | RESEARCH.md §2 Step 6 verbatim |
| `lib/supabase/server.ts` | client factory | request-response | RESEARCH.md §2 Step 7 verbatim |
| `lib/supabase/types.ts` | types | — | Generated by `supabase gen types typescript --local` |
| `lib/auth.ts` | utility | request-response | RESEARCH.md §2 "Helper" block verbatim |
| `app/actions/bootstrap.ts` | server action | CRUD | RESEARCH.md §6 `resolveOrBootstrapTree` verbatim |
| `app/actions/trees.ts` | server action | CRUD | RESEARCH.md §7 `listMyTrees` + `createNewTree` + `renameTree` verbatim |
| `app/page.tsx` | RSC page | request-response | RESEARCH.md §6 "Root page" block (4 lines) |
| `app/(app)/tree/[treeId]/page.tsx` | RSC page | request-response | New — fetch tree+seed person via `supabaseServer()`, render `<TopBar>` + `<GridBackground>` + `<SeedPersonNode>` + `<EmptyTreeOverlay>` |
| `tests/rls.spec.ts` | integration test | batch | RESEARCH.md §5 "Testing RLS" 7-step checklist |
| `e2e/signin-bootstrap.spec.ts` | E2E test | request-response | RESEARCH.md §12 Deploy checklist (single flow: sign in → seeded tree → sign out) |
| `vitest.config.ts` | config | — | `@vitejs/plugin-react@5` + `jsdom` — boilerplate |
| `playwright.config.ts` | config | — | Chromium-only per RESEARCH.md §1 "E2E" note |

---

## Metadata

**Analog search scope:**
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/design_handoff_family_tree/source/` (7 files: `login.jsx`, `app.jsx`, `components.jsx`, `icons.jsx`, `model.jsx`, `share.jsx`, `styles.css`)
- `/Users/davezabihaylo/Documents/ClaudeCode/czfamtree/` root (no `src/` exists — greenfield)

**Files scanned:** 7 handoff prototype sources + project CLAUDE.md + phase RESEARCH.md + phase UI-SPEC.md

**Handoff files referenced as analogs (with line ranges used):**
- `login.jsx` L18-57 (layout split, headline, button, foot), L60-123 (SVG illustration)
- `app.jsx` L347-378 (topbar), L440-448 (empty overlay), L266-270 (update pattern), L287-302 (bulk mutation pattern)
- `components.jsx` L5-72 (PersonNode), L86-97 (outside-click pattern), L170-171 (field-input rename)
- `styles.css` L2-21 (tokens), L59-64 (grid-bg), L117-124 (field-input), L142-218 (node + is-me), L276-330 (topbar + presence), L417-455 (modal), L466-476 (invite-avatar), L489-541 (tweaks-panel — dropdown styling), L612-705 (login), L716-732 (empty-card), L742-745 (focus-visible)
- `icons.jsx` (Google glyph L33-40 — Clerk renders its own, reference only)
- `model.jsx` L1-12 (uid, initials — Phase 2+ relevance; Phase 1 references the mental-model only)

**Pattern extraction date:** 2026-04-21

**Key design-system locks (UI-SPEC overrides of handoff):**
1. Topbar height: **52px** (handoff) — NOT 56px (REQUIREMENTS.md PANEL-02 was stale)
2. Typography: **4 sizes / 2 weights** (UI-SPEC) — NOT handoff's 6/3
3. Body text: **14px** (UI-SPEC) — promoted from handoff's 15px `.login-sub`
4. Sign-in button padding: **8×14px** (UI-SPEC `.btn` component constant) — NOT handoff's `.google-btn` 12×20px
5. Spacing tokens: **4px multiples only** (UI-SPEC) — handoff's 6/10/14/28 become arbitrary values where needed
6. Mono micro: **unified to 11px** (UI-SPEC) — handoff's 9/10/11 all collapse
7. Empty overlay copy: replaced handoff's "Click your card to add relatives" with UI-SPEC's two-line `Your tree is ready.` / `Click your card to start adding relatives — or stay here and get your bearings.`

---

## Planner Consumption Notes

1. **File count per plan:** 29 files total. Suggested split into 4 plans:
   - **Plan A (Infra & tooling):** `package.json`, `tsconfig.json`, `next.config.ts`, `.env.local.example`, `middleware.ts`, `app/globals.css`, `app/layout.tsx`, `supabase/config.toml`, `vitest.config.ts`, `playwright.config.ts` (10 files)
   - **Plan B (Schema + RLS):** `supabase/migrations/20260421000000_initial_schema.sql`, `supabase/seed.sql`, `lib/supabase/types.ts`, `tests/rls.spec.ts` (4 files)
   - **Plan C (Auth wiring + sign-in UI):** `lib/supabase/browser.ts`, `lib/supabase/server.ts`, `lib/auth.ts`, `app/actions/bootstrap.ts`, `app/(auth)/layout.tsx`, `app/(auth)/sign-in/.../page.tsx`, `app/(auth)/sign-up/.../page.tsx`, `components/auth/SignInIllustration.tsx`, `e2e/signin-bootstrap.spec.ts` (9 files)
   - **Plan D (App shell + topbar):** `app/actions/trees.ts`, `app/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/tree/[treeId]/page.tsx`, `components/shell/*` (9 files) + `AuthError.tsx` (1 file) — 10 files

2. **Dependency order:**
   - B (schema) must land before C and D query the DB
   - A (infra) must land before anything renders (`globals.css` tokens, `middleware.ts` gates routes)
   - C (auth UI) can land parallel with D (shell) after A+B
   - Tests (`rls.spec.ts`, `e2e/signin-bootstrap.spec.ts`) gate acceptance

3. **Verbatim copy blocks** (planner should quote directly in plan actions):
   - RESEARCH.md §4 (migration SQL)
   - RESEARCH.md §6 (bootstrap RPC + action + root page)
   - RESEARCH.md §7 (trees actions)
   - RESEARCH.md §10 (globals.css `@theme` block + layout.tsx)
   - RESEARCH.md §11 (Clerk appearance + AuthLayout)
   - handoff `styles.css` L2-21 (tokens)
   - handoff `login.jsx` L60-123 (illustration SVG)

4. **Non-negotiables from UI-SPEC (checker will reject if violated):**
   - `border-radius: 0` everywhere except `.invite-avatar` / `.presence-avatar` circles
   - Only 2 font weights (400, 600) loaded for Inter
   - OKLCH color values copied verbatim (no hex conversion)
   - Copy strings match UI-SPEC §Copywriting Contract exactly (Sheets-sync clause DELETED from sub-headline, etc.)
   - Topbar = 52px, NOT 56px
