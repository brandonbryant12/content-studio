/**
 * Voiceover CRUD E2E Tests
 *
 * Tests for voiceover Create, Read, Update, Delete operations:
 * - Create a new voiceover
 * - Edit voiceover title and text
 * - Delete voiceover with confirmation
 */

import { authenticatedTest, expect } from '../../fixtures';

authenticatedTest.describe('Voiceover CRUD Operations', () => {
  authenticatedTest.beforeEach(async ({ api }) => {
    // Clean up voiceovers before each test
    await api.deleteAllVoiceovers();
  });

  authenticatedTest.afterEach(async ({ api }) => {
    // Clean up after each test
    await api.deleteAllVoiceovers();
  });

  // ============================================================================
  // Create Tests
  // ============================================================================

  authenticatedTest.describe('Create Voiceover', () => {
    authenticatedTest(
      'displays voiceovers page correctly',
      async ({ voiceoversPage }) => {
        await voiceoversPage.goto();
        await voiceoversPage.expectVisible();
      },
    );

    authenticatedTest(
      'shows empty state when no voiceovers',
      async ({ voiceoversPage }) => {
        await voiceoversPage.goto();
        await voiceoversPage.expectEmpty();
      },
    );

    authenticatedTest(
      'can create new voiceover',
      async ({ voiceoversPage, page }) => {
        await voiceoversPage.goto();
        await voiceoversPage.createVoiceover();

        // Should navigate to new voiceover detail page
        await expect(page).toHaveURL(/\/voiceovers\/.+/);

        // Should show the workbench with title
        await expect(voiceoversPage.getWorkbenchTitle()).toBeVisible();
      },
    );

    authenticatedTest(
      'new voiceover starts in drafting status',
      async ({ voiceoversPage }) => {
        await voiceoversPage.goto();
        await voiceoversPage.createVoiceover();

        // Should show drafting status
        await voiceoversPage.expectStatusDrafting();
      },
    );

    authenticatedTest(
      'new voiceover has empty text editor',
      async ({ voiceoversPage }) => {
        await voiceoversPage.goto();
        await voiceoversPage.createVoiceover();

        // Text editor should be visible and empty
        const editor = voiceoversPage.getTextEditor();
        await expect(editor).toBeVisible();
        const text = await voiceoversPage.getText();
        expect(text).toBe('');
      },
    );
  });

  // ============================================================================
  // Read/List Tests
  // ============================================================================

  authenticatedTest.describe('List Voiceovers', () => {
    authenticatedTest('can search voiceovers', async ({ voiceoversPage, api }) => {
      // Create voiceovers via API
      await api.createVoiceover({ title: 'Alpha Voiceover' });
      await api.createVoiceover({ title: 'Beta Voiceover' });

      await voiceoversPage.goto();

      // Search for "Alpha"
      await voiceoversPage.search('Alpha');

      // Should only see Alpha voiceover
      await voiceoversPage.expectVoiceoverVisible('Alpha Voiceover');
    });

    authenticatedTest('can clear search', async ({ voiceoversPage, api }) => {
      // Create voiceovers via API
      await api.createVoiceover({ title: 'Alpha Voiceover' });
      await api.createVoiceover({ title: 'Beta Voiceover' });

      await voiceoversPage.goto();

      // Search then clear
      await voiceoversPage.search('Alpha');
      await voiceoversPage.clearSearch();

      // Should see all voiceovers again
      await voiceoversPage.expectVoiceoverVisible('Alpha Voiceover');
      await voiceoversPage.expectVoiceoverVisible('Beta Voiceover');
    });

    authenticatedTest(
      'can navigate to voiceover detail',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const voiceover = await api.createVoiceover({
          title: 'E2E Test Voiceover',
        });

        // Navigate to the voiceover
        await page.goto(`/voiceovers/${voiceover.id}`);

        // Should be on the voiceover detail page
        await expect(page).toHaveURL(/\/voiceovers\/.+/);
        await expect(voiceoversPage.getWorkbenchTitle()).toContainText(
          'E2E Test Voiceover',
        );
      },
    );
  });

  // ============================================================================
  // Update Tests
  // ============================================================================

  authenticatedTest.describe('Edit Voiceover', () => {
    authenticatedTest(
      'can edit voiceover text',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const voiceover = await api.createVoiceover({
          title: 'Edit Test Voiceover',
          text: 'Original text content.',
        });

        // Navigate to the voiceover
        await page.goto(`/voiceovers/${voiceover.id}`);

        // Edit the text
        const newText = 'Updated voiceover text content for testing.';
        await voiceoversPage.enterText(newText);

        // Should show unsaved changes indicator
        await expect(
          voiceoversPage.getActionBar().getByText(/unsaved changes/i),
        ).toBeVisible();

        // Click Save & Generate to save (assuming text was entered)
        await voiceoversPage.clickSaveAndGenerate();

        // Status should change to generating
        await voiceoversPage.expectStatusGeneratingAudio();
      },
    );

    authenticatedTest(
      'shows unsaved changes when text is modified',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API with text
        const voiceover = await api.createVoiceover({
          title: 'Change Detection Test',
          text: 'Initial text.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Initially should not show unsaved changes
        await expect(
          voiceoversPage.getActionBar().getByText(/unsaved changes/i),
        ).not.toBeVisible();

        // Edit the text
        await voiceoversPage.enterText('Modified text content.');

        // Should now show unsaved changes
        await expect(
          voiceoversPage.getActionBar().getByText(/unsaved changes/i),
        ).toBeVisible();
      },
    );
  });

  // ============================================================================
  // Delete Tests
  // ============================================================================

  authenticatedTest.describe('Delete Voiceover', () => {
    authenticatedTest(
      'can delete voiceover from detail page with confirmation',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const voiceover = await api.createVoiceover({
          title: 'Delete Test Voiceover',
        });

        // Navigate to the voiceover
        await page.goto(`/voiceovers/${voiceover.id}`);

        // Delete the voiceover (includes confirmation)
        await voiceoversPage.deleteVoiceover();

        // Should navigate back to list
        await expect(page).toHaveURL(/\/voiceovers$/);

        // Voiceover should not be in the list
        await voiceoversPage.expectVoiceoverNotVisible('Delete Test Voiceover');
      },
    );

    authenticatedTest(
      'can cancel delete confirmation',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        const voiceover = await api.createVoiceover({
          title: 'Cancel Delete Test',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Click delete button
        await voiceoversPage.getDeleteButton().click();

        // Cancel the dialog
        await voiceoversPage.cancelDialog();

        // Should still be on the detail page
        await expect(page).toHaveURL(/\/voiceovers\/.+/);
        await expect(voiceoversPage.getWorkbenchTitle()).toContainText(
          'Cancel Delete Test',
        );
      },
    );

    authenticatedTest(
      'can delete voiceover from list page',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover via API
        await api.createVoiceover({ title: 'List Delete Test' });

        await voiceoversPage.goto();

        // Delete from list
        await voiceoversPage.deleteVoiceoverFromList('List Delete Test');

        // Wait for removal
        await page.waitForTimeout(500);

        // Voiceover should no longer be visible
        await voiceoversPage.expectVoiceoverNotVisible('List Delete Test');
      },
    );
  });
});
