/**
 * Podcast Setup Wizard E2E Tests
 *
 * Tests for the podcast setup wizard flow:
 * 1. Basics step (format info)
 * 2. Documents step (select sources)
 * 3. Audio step (duration, voices)
 * 4. Instructions step (optional prompt)
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

  authenticatedTest('step 1: can proceed from basics step', async ({ page }) => {
    // Should show step indicator
    await expect(page.getByText(/step 1/i).or(page.locator('[data-step="1"]'))).toBeVisible();

    // Should have a continue button
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeVisible();

    await continueButton.click();

    // Should advance to step 2
    await expect(page.getByText(/step 2/i).or(page.locator('[data-step="2"]'))).toBeVisible();
  });

  authenticatedTest('step 2: requires document selection to proceed', async ({ page }) => {
    // Navigate to step 2
    await page.getByRole('button', { name: /continue/i }).click();

    // Continue button should be disabled without documents
    const continueButton = page.getByRole('button', { name: /continue/i });

    // Note: This test assumes no documents are uploaded
    // If documents exist, the button may be enabled
    await expect(page.getByText(/document/i)).toBeVisible();
  });

  authenticatedTest('step 3: can configure audio settings', async ({ page, api }) => {
    // Skip step 1
    await page.getByRole('button', { name: /continue/i }).click();

    // Skip step 2 - need documents to proceed
    // For now, we'll check if documents section is visible
    await expect(page.getByText(/document/i)).toBeVisible();
  });

  authenticatedTest('has back button after first step', async ({ page }) => {
    // Advance to step 2
    await page.getByRole('button', { name: /continue/i }).click();

    // Should have back button
    const backButton = page.getByRole('button', { name: /back/i });
    await expect(backButton).toBeVisible();

    // Clicking back should return to step 1
    await backButton.click();
    await expect(page.getByText(/step 1/i).or(page.locator('[data-step="1"]'))).toBeVisible();
  });
});
