/**
 * Sources List E2E Tests
 *
 * Tests for the sources list page including:
 * - Viewing source list
 * - Search functionality
 * - Delete functionality
 */

import { authenticatedTest, expect } from '../../fixtures';

authenticatedTest.describe('Sources List', () => {
  authenticatedTest.beforeEach(async ({ sourcesPage }) => {
    await sourcesPage.goto();
  });

  authenticatedTest(
    'displays sources page correctly',
    async ({ sourcesPage }) => {
      await sourcesPage.expectVisible();
    },
  );

  authenticatedTest(
    'shows empty state when no sources',
    async ({ sourcesPage, api }) => {
      // Clean up any existing sources
      await api.deleteAllSources();
      await sourcesPage.goto();
      await sourcesPage.expectEmpty();
    },
  );

  authenticatedTest('can open upload dialog', async ({ sourcesPage }) => {
    await sourcesPage.openUploadDialog();
    await expect(sourcesPage.getUploadDialog()).toBeVisible();
  });
});
