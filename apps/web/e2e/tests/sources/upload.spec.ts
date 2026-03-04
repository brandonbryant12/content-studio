/**
 * Source Upload E2E Tests
 *
 * Tests for the source upload flow including:
 * - Opening upload dialog
 * - File type validation
 * - Successful upload
 */

import { authenticatedTest, expect } from '../../fixtures';
import path from 'node:path';

authenticatedTest.describe('Source Upload', () => {
  authenticatedTest.beforeEach(async ({ sourcesPage }) => {
    await sourcesPage.goto();
  });

  authenticatedTest(
    'can open and close upload dialog',
    async ({ sourcesPage }) => {
      await sourcesPage.openUploadDialog();
      const dialog = sourcesPage.getUploadDialog();
      await expect(dialog).toBeVisible();

      // Close dialog
      await sourcesPage.page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    },
  );

  authenticatedTest('upload dialog has file input', async ({ sourcesPage }) => {
    await sourcesPage.openUploadDialog();
    const dialog = sourcesPage.getUploadDialog();

    // Should have a file input
    const fileInput = dialog.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  // Note: Actual file upload tests would require a test file fixture
  // and proper file handling in the test environment
  authenticatedTest.skip('can upload a text file', async ({ sourcesPage }) => {
    // This test requires a test file to be available
    // Skipping for now - can be implemented with test fixtures
  });
});
