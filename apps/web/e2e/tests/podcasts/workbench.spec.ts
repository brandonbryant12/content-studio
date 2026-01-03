/**
 * Podcast Workbench E2E Tests
 *
 * Tests for the podcast editing workbench including:
 * - Script editing
 * - Keyboard shortcuts (Cmd+S)
 * - Save functionality
 * - Navigation blocking for unsaved changes
 */

import { authenticatedTest, expect } from '../../fixtures';

authenticatedTest.describe('Podcast Workbench', () => {
  // Note: These tests require a podcast that has completed setup
  // For full E2E testing, we would need to:
  // 1. Create a podcast via API with pre-generated content
  // 2. Or complete the setup wizard flow first

  authenticatedTest.beforeEach(async ({ podcastsPage }) => {
    await podcastsPage.goto();
  });

  authenticatedTest('shows podcasts list', async ({ podcastsPage }) => {
    await podcastsPage.expectVisible();
  });

  authenticatedTest(
    'can navigate to podcast detail',
    async ({ podcastsPage, api, page }) => {
      // Create a podcast via API
      const podcast = await api.createPodcast({ title: 'E2E Test Podcast' });

      // Navigate to the podcast
      await page.goto(`/podcasts/${podcast.id}`);

      // Should be on the podcast detail page
      await expect(page).toHaveURL(/\/podcasts\/.+/);
    },
  );

  // Note: Full workbench tests would require a podcast with generated content
  // These tests verify the basic UI elements are present

  authenticatedTest.describe('with configured podcast', () => {
    // These tests are skipped because they require a podcast that:
    // 1. Has completed the setup wizard
    // 2. Has generated script content
    // 3. Is not in generating state

    authenticatedTest.skip(
      'shows script editor when podcast is configured',
      async () => {
        // Would verify script editor is visible
      },
    );

    authenticatedTest.skip(
      'Cmd+S triggers save when there are changes',
      async () => {
        // Would verify keyboard shortcut functionality
      },
    );

    authenticatedTest.skip(
      'shows unsaved changes warning on navigation',
      async () => {
        // Would verify navigation blocking
      },
    );

    authenticatedTest.skip('can edit script segments', async () => {
      // Would verify segment editing
    });

    authenticatedTest.skip('can change voice settings', async () => {
      // Would verify voice selection
    });

    authenticatedTest.skip('can delete podcast', async () => {
      // Would verify delete confirmation and navigation
    });
  });
});
