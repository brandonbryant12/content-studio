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

  authenticatedTest('displays podcasts page correctly', async ({ podcastsPage }) => {
    await podcastsPage.expectVisible();
  });

  authenticatedTest('shows empty state when no podcasts', async ({ podcastsPage, api }) => {
    // Clean up any existing podcasts
    await api.deleteAllPodcasts();
    await podcastsPage.goto();
    await podcastsPage.expectEmpty();
  });

  authenticatedTest('can create new podcast', async ({ podcastsPage, page }) => {
    await podcastsPage.createPodcast();
    // Should navigate to new podcast page (setup wizard)
    await expect(page).toHaveURL(/\/podcasts\/.+/);
  });

  authenticatedTest('can create podcast from empty state', async ({ podcastsPage, page, api }) => {
    await api.deleteAllPodcasts();
    await podcastsPage.goto();

    await podcastsPage.createPodcast();
    await expect(page).toHaveURL(/\/podcasts\/.+/);
  });
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
