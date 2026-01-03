/**
 * Protected Routes E2E Tests
 *
 * Tests that unauthenticated users are redirected from protected routes.
 */

import { test, expect, authenticatedTest } from '../../fixtures';

test.describe('Protected Routes - Unauthenticated', () => {
  test('redirects unauthenticated user from dashboard to home', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or home page
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('redirects unauthenticated user from documents to home', async ({ page }) => {
    await page.goto('/documents');
    await expect(page).not.toHaveURL(/\/documents/);
  });

  test('redirects unauthenticated user from podcasts to home', async ({ page }) => {
    await page.goto('/podcasts');
    await expect(page).not.toHaveURL(/\/podcasts/);
  });

  test('redirects unauthenticated user from podcast detail to home', async ({ page }) => {
    await page.goto('/podcasts/some-id');
    await expect(page).not.toHaveURL(/\/podcasts\/some-id/);
  });
});

authenticatedTest.describe('Protected Routes - Authenticated', () => {
  authenticatedTest('can access dashboard when authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  authenticatedTest('can access documents when authenticated', async ({ page }) => {
    await page.goto('/documents');
    await expect(page).toHaveURL(/\/documents/);
    await expect(page.getByText('Documents')).toBeVisible();
  });

  authenticatedTest('can access podcasts when authenticated', async ({ page }) => {
    await page.goto('/podcasts');
    await expect(page).toHaveURL(/\/podcasts/);
    await expect(page.getByText('Podcasts')).toBeVisible();
  });
});
