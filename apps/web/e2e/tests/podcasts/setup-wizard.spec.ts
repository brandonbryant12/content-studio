/**
 * Podcast Setup Wizard E2E Tests
 *
 * Tests for the podcast setup wizard flow:
 * 1. Documents step (select sources)
 * 2. Audio step (duration, voices)
 * 3. Instructions step (optional prompt)
 */

import { authenticatedTest, expect } from '../../fixtures';

authenticatedTest.describe('Podcast Setup Wizard', () => {
  authenticatedTest.beforeEach(async ({ podcastsPage, api }) => {
    // Clean up and create a fresh podcast for each test
    await api.deleteAllPodcasts();
    await podcastsPage.goto();
    await podcastsPage.createPodcast();
  });

  authenticatedTest('shows setup wizard for new podcast', async ({ page }) => {
    // Should be on the podcast detail page
    await expect(page).toHaveURL(/\/podcasts\/.+/);

    // Should show setup wizard UI
    await expect(page.getByText(/step/i)).toBeVisible();
  });

  authenticatedTest('step 1: shows documents step first', async ({ page }) => {
    // Should show step indicator
    await expect(
      page.getByText(/step 1/i).or(page.locator('[data-step="1"]')),
    ).toBeVisible();

    // Should show documents step
    await expect(
      page.getByRole('heading', { name: /add source documents/i }),
    ).toBeVisible();

    // Should have a continue button
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeVisible();
  });

  authenticatedTest(
    'step 2: can configure audio settings',
    async ({ page, api }) => {
      // Upload a document first so we can proceed
      const doc = await api.uploadDocument('Test Document', 'Test content');

      // Refresh to see the document
      await page.reload();

      // Select the document
      await page.getByText('Test Document').click();

      // Continue to step 2
      await page.getByRole('button', { name: /continue/i }).click();

      // Should show audio step
      await expect(
        page.getByRole('heading', { name: /audio settings/i }),
      ).toBeVisible();
    },
  );

  authenticatedTest(
    'has back button after first step',
    async ({ page, api }) => {
      // Upload a document first so we can proceed
      await api.uploadDocument('Test Document', 'Test content');

      // Refresh to see the document
      await page.reload();

      // Select the document
      await page.getByText('Test Document').click();

      // Advance to step 2
      await page.getByRole('button', { name: /continue/i }).click();

      // Should have back button
      const backButton = page.getByRole('button', { name: /back/i });
      await expect(backButton).toBeVisible();

      // Clicking back should return to step 1
      await backButton.click();
      await expect(
        page.getByText(/step 1/i).or(page.locator('[data-step="1"]')),
      ).toBeVisible();
    },
  );

  authenticatedTest('step 1: can search documents', async ({ page, api }) => {
    // Upload multiple documents
    await api.uploadDocument('Alpha Report', 'Content about alpha');
    await api.uploadDocument('Beta Analysis', 'Content about beta');
    await api.uploadDocument('Gamma Study', 'Content about gamma');

    // Refresh to see the documents
    await page.reload();

    // Should see all documents initially
    await expect(page.getByText('Alpha Report')).toBeVisible();
    await expect(page.getByText('Beta Analysis')).toBeVisible();
    await expect(page.getByText('Gamma Study')).toBeVisible();

    // Search for "Alpha"
    const searchInput = page.getByPlaceholder(/search documents/i);
    await searchInput.fill('Alpha');

    // Should only see Alpha Report
    await expect(page.getByText('Alpha Report')).toBeVisible();
    await expect(page.getByText('Beta Analysis')).toBeHidden();
    await expect(page.getByText('Gamma Study')).toBeHidden();

    // Clear search
    await searchInput.clear();

    // Should see all documents again
    await expect(page.getByText('Alpha Report')).toBeVisible();
    await expect(page.getByText('Beta Analysis')).toBeVisible();
    await expect(page.getByText('Gamma Study')).toBeVisible();
  });

  authenticatedTest('step 1: can switch to upload tab', async ({ page }) => {
    // Should see tabs
    await expect(
      page.getByRole('button', { name: /select existing/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /upload new/i }),
    ).toBeVisible();

    // Click upload tab
    await page.getByRole('button', { name: /upload new/i }).click();

    // Should see upload zone
    await expect(page.getByText(/drop your file here/i)).toBeVisible();
    await expect(
      page.getByText(/supports txt, pdf, docx, pptx/i),
    ).toBeVisible();
  });

  authenticatedTest(
    'wizard settings are persisted to workbench after generation starts',
    async ({ page, api }) => {
      // Upload a document first
      await api.uploadDocument('Test Document', 'Test content for podcast');
      await page.reload();

      // Step 1: Select document
      await page.getByText('Test Document').click();
      await page.getByRole('button', { name: /continue/i }).click();

      // Step 2: Select non-default duration (10 min instead of default 5)
      await page.getByRole('button', { name: '10 min' }).click();
      await page.getByRole('button', { name: /continue/i }).click();

      // Step 3: Enter custom instructions
      const customInstructions =
        'Focus on technical details and include examples';
      await page
        .getByPlaceholder(/add any specific instructions/i)
        .fill(customInstructions);

      // Complete wizard by clicking Generate
      await page.getByRole('button', { name: /generate/i }).click();

      // Wait for workbench to appear (wizard exits when generation starts)
      await expect(page.locator('.workbench-panel-left').first()).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Settings tab
      await page.getByRole('button', { name: /settings/i }).click();

      // Verify duration is 10 (not the default 5)
      await expect(page.locator('.mixer-duration-value')).toHaveText('10');

      // Verify custom instructions are populated
      await expect(page.locator('.mixer-notes-textarea')).toHaveValue(
        customInstructions,
      );
    },
  );
});
