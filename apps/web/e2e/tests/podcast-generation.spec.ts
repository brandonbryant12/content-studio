import { test, expect } from '@playwright/test';
import {
  login,
  createDocument,
  deletePodcast,
  deleteDocument,
} from '../fixtures';

test.describe('Podcast Generation', () => {
  // Store IDs for cleanup
  let documentId: string | undefined;
  let podcastId: string | undefined;

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup created resources using page.request (shares auth cookies)
    if (podcastId) {
      await deletePodcast(page.request, podcastId).catch(() => {});
      podcastId = undefined;
    }
    if (documentId) {
      await deleteDocument(page.request, documentId).catch(() => {});
      documentId = undefined;
    }
  });

  test('can navigate to podcast creation', async ({ page }) => {
    // Navigate to podcasts page
    await page.goto('/podcasts');

    // Click either "Create New" (header) or "Create Podcast" (empty state) button
    const createButton = page
      .getByRole('button', { name: 'Create New' })
      .or(page.getByRole('button', { name: 'Create Podcast' }));
    await createButton.first().click();

    // Should see the podcast creation wizard (Step 1)
    await expect(
      page.getByRole('heading', { name: "Let's Create Your Podcast" }),
    ).toBeVisible();
    await expect(page.getByText('STEP 1 OF 4')).toBeVisible();
  });

  test('can proceed through podcast creation wizard', async ({ page }) => {
    // First create a document via API so we have something to select
    const doc = await createDocument(page.request, {
      title: 'E2E Test Document',
      content: `
        This is a comprehensive test document for podcast generation.
        It contains multiple paragraphs with interesting content about technology.
      `,
    });
    documentId = doc.id;

    // Navigate to new podcast
    await page.goto('/podcasts');

    // Click either "Create New" (header) or "Create Podcast" (empty state) button
    const createButton = page
      .getByRole('button', { name: 'Create New' })
      .or(page.getByRole('button', { name: 'Create Podcast' }));
    await createButton.first().click();

    // Step 1: Format selection - should already have "Conversation" selected
    await expect(page.getByText('STEP 1 OF 4')).toBeVisible();
    await expect(page.getByText('Conversation')).toBeVisible();

    // Click Next/Continue to proceed to step 2
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 2: Should be document selection
    await expect(page.getByText(/STEP 2 OF 4/i)).toBeVisible();
  });

  test.skip('can complete full podcast creation wizard', async ({ page }) => {
    // TODO: Implement full wizard flow once UI is stable
    // This test should:
    // 1. Select format (Conversation)
    // 2. Select documents
    // 3. Configure settings
    // 4. Confirm and create
  });

  test.skip('shows generation status during script creation', async ({
    page,
  }) => {
    // TODO: Implement once we can create podcasts through the wizard
    // This test should:
    // 1. Create a podcast through the wizard
    // 2. Navigate to the workbench
    // 3. Trigger script generation
    // 4. Verify status updates appear
  });
});

test.describe('Version History', () => {
  test.skip('shows version history after regeneration', async ({ page }) => {
    // This test requires a podcast with an existing script
    // Skip for now until we have proper seeding
    // Navigate to an existing podcast with script
    // await page.goto(`/podcasts/${existingPodcastId}`);
    // Regenerate script
    // await page.getByRole('button', { name: /regenerate script/i }).click();
    // Wait for generation
    // await expect(page.getByText(/script generated/i)).toBeVisible({ timeout: 30000 });
    // Check version history shows v1 and v2
    // await expect(page.getByText('v2')).toBeVisible();
    // await expect(page.getByText('v1')).toBeVisible();
  });

  test.skip('can restore previous version', async ({ page }) => {
    // This test requires a podcast with multiple versions
    // Skip for now until we have proper seeding
    // Navigate to version history
    // Click on v1 to view
    // Click restore button
    // Verify v1 content is now active
  });
});

test.describe('Error Handling', () => {
  test.skip('shows error message on generation failure', async ({ page }) => {
    // This test requires ability to trigger a failure
    // Skip for now - will implement with mock AI service
    // Navigate to podcast
    // Trigger generation that will fail
    // Verify error message is shown
    // Verify retry button is available
  });
});
