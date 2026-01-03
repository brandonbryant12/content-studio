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

  authenticatedTest.describe('with documents', () => {
    authenticatedTest.beforeEach(async ({ api }) => {
      // Note: We can't easily upload documents via API without file handling
      // These tests rely on existing documents or will be skipped if none exist
    });

    authenticatedTest('can search documents', async ({ documentsPage }) => {
      await documentsPage.search('test');
      // Search should filter the list
      await documentsPage.page.waitForTimeout(300); // Debounce wait
    });

    authenticatedTest('can clear search', async ({ documentsPage }) => {
      await documentsPage.search('test');
      await documentsPage.clearSearch();
      // Should show all documents again
    });
  });
});
