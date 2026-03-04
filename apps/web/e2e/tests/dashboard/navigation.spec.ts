/**
 * Dashboard Navigation E2E Tests
 *
 * Tests for dashboard layout, sidebar navigation, and quick actions.
 */

import { authenticatedTest, expect } from '../../fixtures';

authenticatedTest.describe('Dashboard', () => {
  authenticatedTest.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  authenticatedTest(
    'displays dashboard correctly',
    async ({ dashboardPage }) => {
      await dashboardPage.expectVisible();
    },
  );

  authenticatedTest(
    'can navigate to sources via sidebar',
    async ({ dashboardPage, page }) => {
      await dashboardPage.navigateVia('Sources');
      await expect(page).toHaveURL(/\/sources/);
    },
  );

  authenticatedTest(
    'can navigate to podcasts via sidebar',
    async ({ dashboardPage, page }) => {
      await dashboardPage.navigateVia('Podcasts');
      await expect(page).toHaveURL(/\/podcasts/);
    },
  );

  authenticatedTest(
    'can navigate to sources via View all link',
    async ({ dashboardPage, page }) => {
      await dashboardPage.goToAllSources();
      await expect(page).toHaveURL(/\/sources/);
    },
  );

  authenticatedTest(
    'can navigate to podcasts via View all link',
    async ({ dashboardPage, page }) => {
      await dashboardPage.goToAllPodcasts();
      await expect(page).toHaveURL(/\/podcasts/);
    },
  );

  authenticatedTest(
    'shows upload source dialog when clicking quick action',
    async ({ dashboardPage, page }) => {
      await dashboardPage.clickUploadSource();
      // Should show upload dialog
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  );

  authenticatedTest(
    'creates new podcast when clicking quick action',
    async ({ dashboardPage, page }) => {
      await dashboardPage.createPodcastAndWait();
      // Should navigate to new podcast page
      await expect(page).toHaveURL(/\/podcasts\/.+/);
    },
  );
});
