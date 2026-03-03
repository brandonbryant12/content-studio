/**
 * Documents List E2E Tests
 *
 * Tests for the documents list page including:
 * - Viewing document list
 * - Search functionality
 * - Delete functionality
 */

import { authenticatedTest, expect } from '../../fixtures';

authenticatedTest.describe('Documents List', () => {
  authenticatedTest.beforeEach(async ({ documentsPage }) => {
    await documentsPage.goto();
  });

  authenticatedTest(
    'displays documents page correctly',
    async ({ documentsPage }) => {
      await documentsPage.expectVisible();
    },
  );

  authenticatedTest(
    'shows empty state when no documents',
    async ({ documentsPage, api }) => {
      // Clean up any existing documents
      await api.deleteAllDocuments();
      await documentsPage.goto();
      await documentsPage.expectEmpty();
    },
  );

  authenticatedTest('can open upload dialog', async ({ documentsPage }) => {
    await documentsPage.openUploadDialog();
    await expect(documentsPage.getUploadDialog()).toBeVisible();
  });
});
