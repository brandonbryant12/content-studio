/**
 * Podcast Create E2E Tests
 *
 * Tests for creating new podcasts.
 */

import { authenticatedTest, expect } from '../../fixtures';

authenticatedTest.describe('Create Podcast', () => {
  authenticatedTest.beforeEach(async ({ podcastsPage }) => {
    await podcastsPage.goto();
  });

  authenticatedTest(
    'displays podcasts page correctly',
    async ({ podcastsPage }) => {
      await podcastsPage.expectVisible();
    },
  );

  // Skip: SSE sync timing makes this test flaky when running in parallel
  // The delete API call doesn't immediately propagate to the client via SSE
  authenticatedTest.skip(
    'shows empty state when no podcasts',
    async ({ podcastsPage, api, page }) => {
      // Clean up any existing podcasts
      await api.deleteAllPodcasts();
      // Hard refresh to get fresh data
      await page.goto('/podcasts', { waitUntil: 'networkidle' });
      // Wait for data to propagate
      await page.waitForTimeout(1000);
      // Reload to get fresh data
      await page.reload({ waitUntil: 'networkidle' });
      await podcastsPage.expectEmpty();
    },
  );

  authenticatedTest(
    'can create new podcast',
    async ({ podcastsPage, page }) => {
      await podcastsPage.createPodcast();
      // Should navigate to new podcast page (setup wizard)
      await expect(page).toHaveURL(/\/podcasts\/.+/);
    },
  );

  authenticatedTest(
    'can create podcast from empty state',
    async ({ podcastsPage, page, api }) => {
      await api.deleteAllPodcasts();
      await podcastsPage.goto();

      await podcastsPage.createPodcast();
      await expect(page).toHaveURL(/\/podcasts\/.+/);
    },
  );
});

authenticatedTest.describe('Podcast List', () => {
  authenticatedTest('can search podcasts', async ({ podcastsPage }) => {
    await podcastsPage.goto();
    await podcastsPage.search('test');
    // Search should filter the list
    await podcastsPage.page.waitForTimeout(300); // Debounce wait
  });

  authenticatedTest('can clear search', async ({ podcastsPage }) => {
    await podcastsPage.goto();
    await podcastsPage.search('test');
    await podcastsPage.clearSearch();
    // Should show all podcasts again
  });
});
