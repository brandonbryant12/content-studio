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

  authenticatedTest(
    'can create new podcast',
    async ({ podcastsPage, page }) => {
      await podcastsPage.createPodcast();
      await expect(page).toHaveURL(/\/podcasts\/new/);
    },
  );

  authenticatedTest(
    'can create podcast from empty state',
    async ({ podcastsPage, page, api }) => {
      await api.deleteAllPodcasts();
      await podcastsPage.goto();

      await podcastsPage.createPodcast();
      await expect(page).toHaveURL(/\/podcasts\/new/);
    },
  );
});
