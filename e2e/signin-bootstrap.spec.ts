import { test, expect } from '@playwright/test';
import { clerk, clerkSetup } from '@clerk/testing/playwright';

/**
 * Phase 1 end-to-end: sign in with a test user -> bootstrap a tree ->
 * land at /tree/<uuid> -> verify topbar + seed node + empty overlay ->
 * sign out -> redirected to /sign-in.
 *
 * Skips cleanly when required env vars are missing so CI without secrets
 * stays green. Run locally with:
 *
 *   CLERK_SECRET_KEY=... \
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... \
 *   E2E_CLERK_USER_USERNAME=... \
 *   E2E_CLERK_USER_PASSWORD=... \
 *   npx playwright test e2e/signin-bootstrap.spec.ts
 */

const ENV_READY =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY &&
  !!process.env.E2E_CLERK_USER_USERNAME &&
  !!process.env.E2E_CLERK_USER_PASSWORD;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  test.skip(!ENV_READY, 'Clerk + E2E env vars missing — populate .env.local');
  await clerkSetup();
});

test.describe('Phase 1: sign-in bootstrap flow', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!ENV_READY, 'Clerk + E2E env vars missing — populate .env.local');
    await page.goto('/sign-in');
  });

  test('sign in with test user → bootstraps tree → lands on /tree/<id> → sees seed You node → signs out', async ({
    page,
  }) => {
    // Uses Clerk's Testing Tokens via @clerk/testing. The test user must exist
    // in the Clerk Dashboard with password strategy enabled before this runs.
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.E2E_CLERK_USER_USERNAME!,
        password: process.env.E2E_CLERK_USER_PASSWORD!,
      },
    });

    // After Clerk session is established, the root RSC should redirect to /tree/<id>
    await page.goto('/');
    await page.waitForURL(/\/tree\/[0-9a-f-]{36}$/);

    // Topbar visible with landmark + brand wordmark
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByText('Family Tree').first()).toBeVisible();

    // Tree title + `· 1 person` meta
    await expect(page.getByText('My family tree')).toBeVisible();
    await expect(page.getByText('· 1 person')).toBeVisible();

    // Seed 'You' node with YOU ribbon
    await expect(page.getByText('YOU')).toBeVisible();

    // Empty-tree overlay copy
    await expect(page.getByText('Your tree is ready.')).toBeVisible();

    // Avatar menu + Sign out
    await page.getByRole('button', { name: 'Open user menu' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.getByRole('button', { name: /Sign out/i }).click();

    // Redirects to /sign-in after sign-out
    await page.waitForURL('**/sign-in**');
    await expect(page.getByText('Every name, a branch.')).toBeVisible();
  });
});
