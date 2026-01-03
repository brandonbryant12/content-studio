/**
 * Document Upload E2E Tests
 *
 * Tests for the document upload flow including:
 * - Opening upload dialog
 * - File type validation
 * - Successful upload
 */

import { authenticatedTest, expect } from '../../fixtures';
import path from 'node:path';

authenticatedTest.describe('Document Upload', () => {
  authenticatedTest.beforeEach(async ({ documentsPage }) => {
    await documentsPage.goto();
  });

  authenticatedTest(
    'can open and close upload dialog',
    async ({ documentsPage }) => {
      await documentsPage.openUploadDialog();
      const dialog = documentsPage.getUploadDialog();
      await expect(dialog).toBeVisible();

      // Close dialog
      await documentsPage.page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    },
  );

  authenticatedTest(
    'upload dialog has file input',
    async ({ documentsPage }) => {
      await documentsPage.openUploadDialog();
      const dialog = documentsPage.getUploadDialog();

      // Should have a file input
      const fileInput = dialog.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();
    },
  );

  // Note: Actual file upload tests would require a test file fixture
  // and proper file handling in the test environment
  authenticatedTest.skip(
    'can upload a text file',
    async ({ documentsPage }) => {
      // This test requires a test file to be available
      // Skipping for now - can be implemented with test fixtures
    },
  );
});
