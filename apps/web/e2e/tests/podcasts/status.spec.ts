/**
 * Podcast Status E2E Tests
 *
 * Tests for status display consistency during podcast generation:
 * - Status badge (top header) and action bar (bottom) should be in sync
 * - Status should show "Generating Script" immediately when generation starts
 * - Status should transition correctly through generation phases
 */

import { authenticatedTest, expect } from '../../fixtures';
import type { Page } from '@playwright/test';

// Generate unique document name for each test run to avoid conflicts
const uniqueDocName = () =>
  `StatusTest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Helper to complete the setup wizard flow
 */
async function completeWizard(page: Page, docName: string): Promise<void> {
  // Wait for wizard to load
  await expect(
    page.getByText(/step 1/i).or(page.locator('[data-step="1"]')),
  ).toBeVisible({ timeout: 5000 });

  // Step 1: Select the document
  await page.getByText(docName).click();
  const continueBtn = page.getByRole('button', { name: /continue/i });
  await expect(continueBtn).toBeEnabled({ timeout: 3000 });
  await continueBtn.click();

  // Step 2: Audio settings - wait for step to load
  await expect(
    page.getByRole('heading', { name: /audio settings/i }),
  ).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 3: Instructions - wait for step to load then click Generate
  await expect(
    page.getByRole('heading', { name: /instructions/i }),
  ).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /generate/i }).click();
}

authenticatedTest.describe('Podcast Status Display', () => {
  authenticatedTest.beforeEach(async ({ api }) => {
    // Clean up before each test
    await api.deleteAllPodcasts();
    await api.deleteAllDocuments();
  });

  authenticatedTest.afterEach(async ({ api }) => {
    // Clean up after each test
    await api.deleteAllPodcasts();
    await api.deleteAllDocuments();
  });

  authenticatedTest(
    'shows "Generating Script" status immediately when generating from wizard',
    async ({ page, podcastsPage, api }) => {
      // Setup: Create a document with unique name
      const docName = uniqueDocName();
      await api.uploadDocument(
        docName,
        'This is test content for generating a podcast. It should have enough words to be meaningful.',
      );

      // Create a new podcast and complete the wizard
      await podcastsPage.goto();
      await podcastsPage.createPodcast();
      await completeWizard(page, docName);

      // Verify: Status should show "Generating Script" immediately
      await podcastsPage.waitForWorkbench();
      await podcastsPage.expectStatusGeneratingScript();
    },
  );

  authenticatedTest(
    'header badge and action bar show consistent status during generation',
    async ({ page, podcastsPage, api }) => {
      // Setup: Create a document with unique name
      const docName = uniqueDocName();
      await api.uploadDocument(
        docName,
        'This is test content for generating a podcast. It should have enough words to be meaningful.',
      );

      // Create a new podcast and complete the wizard
      await podcastsPage.goto();
      await podcastsPage.createPodcast();
      await completeWizard(page, docName);

      // Wait for workbench to appear
      await podcastsPage.waitForWorkbench();

      // Verify: Both header badge and action bar should show "Generating Script"
      await podcastsPage.expectGeneratingStatusSync();
    },
  );

  authenticatedTest(
    'does NOT show "Drafting" when generation has started',
    async ({ page, podcastsPage, api }) => {
      // Setup: Create a document with unique name
      const docName = uniqueDocName();
      await api.uploadDocument(
        docName,
        'This is test content for generating a podcast.',
      );

      // Create a new podcast and complete the wizard
      await podcastsPage.goto();
      await podcastsPage.createPodcast();
      await completeWizard(page, docName);

      // Wait for workbench
      await podcastsPage.waitForWorkbench();

      // Verify: Status should NOT show "Drafting" - should show "Generating Script"
      await expect(
        page.locator('.workbench-meta').getByText(/drafting/i),
      ).not.toBeVisible();

      // Instead, it should show "Generating Script"
      await podcastsPage.expectStatusGeneratingScript();
    },
  );

  authenticatedTest(
    'new podcast shows "Drafting" status before generation',
    async ({ page, podcastsPage, api }) => {
      // Create a podcast via API (skips wizard)
      const podcast = await api.createPodcast({ title: 'Draft Podcast' });

      // Navigate to the podcast
      await page.goto(`/podcasts/${podcast.id}`);

      // Should show setup wizard (drafting state before configuration)
      await expect(page.getByText(/step/i)).toBeVisible();

      // The podcast status in the database should be 'drafting'
      const refreshedPodcast = await api.getPodcast(podcast.id);
      expect(refreshedPodcast.status).toBe('drafting');
    },
  );
});

authenticatedTest.describe('Podcast Status Transitions', () => {
  authenticatedTest.beforeEach(async ({ api }) => {
    await api.deleteAllPodcasts();
    await api.deleteAllDocuments();
  });

  authenticatedTest.afterEach(async ({ api }) => {
    await api.deleteAllPodcasts();
    await api.deleteAllDocuments();
  });

  authenticatedTest(
    'generation progress shows script step during generation',
    async ({ page, podcastsPage, api }) => {
      // Setup with unique name
      const docName = uniqueDocName();
      await api.uploadDocument(docName, 'Test content for podcast generation.');

      await podcastsPage.goto();
      await podcastsPage.createPodcast();
      await completeWizard(page, docName);

      // Wait for workbench
      await podcastsPage.waitForWorkbench();

      // Should show "Script" in the progress indicator (right panel)
      await expect(page.getByText('Script').first()).toBeVisible({
        timeout: 5000,
      });
    },
  );
});
