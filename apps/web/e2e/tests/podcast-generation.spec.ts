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

  test('full podcast workflow: create, generate, edit, regenerate, version history', async ({
    page,
  }) => {
    // Increase timeout for this comprehensive test
    test.setTimeout(120000);

    // ========================================
    // PART 1: Create a document via API
    // ========================================
    const doc = await createDocument(page.request, {
      title: 'E2E Workflow Test Document',
      content: `
        Artificial Intelligence and Machine Learning: A Comprehensive Overview

        Artificial intelligence has transformed how we interact with technology.
        Machine learning algorithms can now recognize patterns in data that would
        take humans years to identify. From recommendation systems to autonomous
        vehicles, AI is reshaping every industry.

        Key applications include natural language processing, computer vision,
        and predictive analytics. Companies are investing billions in AI research
        to stay competitive in the global marketplace.
      `,
    });
    documentId = doc.id;

    // ========================================
    // PART 2: Create podcast through wizard
    // ========================================
    await page.goto('/podcasts');

    // Click create button
    const createButton = page
      .getByRole('button', { name: 'Create New' })
      .or(page.getByRole('button', { name: 'Create Podcast' }));
    await createButton.first().click();

    // STEP 1: Format selection
    await expect(page.getByText('STEP 1 OF 4')).toBeVisible();
    await expect(page.getByText('Conversation')).toBeVisible();
    await page.getByRole('button', { name: /next|continue/i }).click();

    // STEP 2: Document selection
    await expect(page.getByText('STEP 2 OF 4')).toBeVisible();

    // Find and click our test document by ID (more reliable than text match)
    // Use data-document-id attribute if available, otherwise use text match
    const docItem = page
      .locator(`[data-document-id="${doc.id}"]`)
      .or(page.getByText('E2E Workflow Test Document').first());
    await expect(docItem.first()).toBeVisible();
    await docItem.first().click();

    await page.getByRole('button', { name: /next|continue/i }).click();

    // STEP 3: Audio settings (duration, voices)
    await expect(page.getByText('STEP 3 OF 4')).toBeVisible();
    // Default settings are fine, proceed
    await page.getByRole('button', { name: /next|continue/i }).click();

    // STEP 4: Custom instructions (optional)
    await expect(page.getByText('STEP 4 OF 4')).toBeVisible();

    // Add custom instructions
    const instructionsInput = page
      .getByPlaceholder(/instructions/i)
      .or(page.locator('textarea'));
    await instructionsInput
      .first()
      .fill('Make it engaging and conversational. Focus on the key insights.');

    // Click Generate to start generation
    await page.getByRole('button', { name: /generate|create/i }).click();

    // ========================================
    // PART 3: Wait for generation to complete
    // ========================================

    // Capture the podcast ID from the URL for cleanup (do this early)
    await page.waitForURL(/\/podcasts\/[a-f0-9-]+/);
    const url = page.url();
    const match = url.match(/podcasts\/([a-f0-9-]+)/);
    if (match) {
      podcastId = match[1];
    }

    // Wait for the mock script content to appear
    // The mock LLM generates "Welcome to the show!" as the first line
    // The UI polls every 2s when status is generating_script, so this should auto-update
    await expect(page.getByText('Welcome to the show!')).toBeVisible({
      timeout: 60000, // Allow time for worker polling (3s) + processing + UI polling (2s)
    });

    // ========================================
    // PART 4: Verify script content is displayed
    // ========================================

    // Verify both host and cohost segments are visible
    await expect(page.getByText('Thanks for having me.')).toBeVisible({
      timeout: 5000,
    });

    // ========================================
    // PART 5: Generate audio
    // ========================================

    // Look for Generate Audio button
    const generateAudioBtn = page.getByRole('button', {
      name: /generate audio/i,
    });
    if (await generateAudioBtn.isVisible()) {
      await generateAudioBtn.click();

      // Wait for audio generation (shows "Generating audio..." status)
      await expect(page.getByText(/generating audio|audio/i)).toBeVisible({
        timeout: 5000,
      });

      // Wait for audio to be ready
      await expect(
        page
          .locator('.audio-player')
          .or(page.getByRole('button', { name: /play/i })),
      ).toBeVisible({ timeout: 60000 });
    }

    // ========================================
    // PART 6: Regenerate script (creates new version)
    // ========================================

    // Look for the "Script" regenerate button in the Regenerate section
    const regenerateScriptBtn = page.getByRole('button', { name: /^script$/i });
    if (await regenerateScriptBtn.isVisible()) {
      await regenerateScriptBtn.click();

      // Wait for regeneration to complete - UI auto-updates via polling
      // First the script may disappear during generation, then reappear
      await expect(page.getByText('Welcome to the show!')).toBeVisible({
        timeout: 60000,
      });
    }

    // ========================================
    // PART 7: Check version history
    // ========================================

    // Look for version history toggle button (clock icon with badge)
    const historyTab = page
      .getByRole('button', { name: /toggle version history/i })
      .or(page.locator('.history-toggle'))
      .or(page.locator('button:has(.lucide-clock)'));

    if (await historyTab.first().isVisible()) {
      await historyTab.first().click();

      // Wait for history panel to open and show version entries
      await expect(page.locator('.history-panel')).toBeVisible({
        timeout: 5000,
      });
      await expect(
        page.locator('.timeline-version-number').first(),
      ).toBeVisible({ timeout: 5000 });

      // Close history panel by clicking outside or the close button
      const closeBtn = page.locator('.history-panel-close');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }

    // ========================================
    // PART 8: Edit script and save (creates new version)
    // ========================================

    // Click on a segment to start editing
    const segmentToEdit = page
      .locator('.segment-item-content')
      .filter({ hasText: 'Welcome to the show!' })
      .first();
    await expect(segmentToEdit).toBeVisible({ timeout: 5000 });
    await segmentToEdit.click();

    // Wait for edit mode - textarea should appear
    const textarea = page.locator('.segment-edit-textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // Modify the text
    await textarea.fill('Welcome to the show! [EDITED]');

    // Press Enter to save segment edit
    await textarea.press('Enter');

    // Verify unsaved changes indicator appears (use exact match to avoid "Unsaved changes" text)
    await expect(page.getByText('Unsaved', { exact: true })).toBeVisible({
      timeout: 5000,
    });

    // Click Save Changes button (use first() as there may be multiple in the UI)
    await page.getByRole('button', { name: 'Save Changes' }).first().click();

    // Wait for save to complete (toast appears)
    await expect(page.getByText('Script saved')).toBeVisible({
      timeout: 10000,
    });

    // Verify the edited text persists
    await expect(page.getByText('Welcome to the show! [EDITED]')).toBeVisible({
      timeout: 5000,
    });

    // Check version history for new version
    if (await historyTab.first().isVisible()) {
      await historyTab.first().click();

      // Wait for v2 or higher to appear (indicates new version was created)
      await expect(
        page.locator('.timeline-version-number').filter({ hasText: /v[2-9]/ }),
      ).toBeVisible({ timeout: 10000 });

      // Should see the new version marked as Current
      await expect(
        page.locator('.timeline-version-badge').filter({ hasText: 'Current' }),
      ).toBeVisible({ timeout: 5000 });

      // Count versions - should have at least 2 (initial + edited, or more if regenerated)
      const versionItems = page.locator('.timeline-version-number');
      const versionCount = await versionItems.count();
      expect(versionCount).toBeGreaterThanOrEqual(2);

      // Close history panel
      const closeBtnAfterEdit = page.locator('.history-panel-close');
      if (await closeBtnAfterEdit.isVisible()) {
        await closeBtnAfterEdit.click();
      }
    }

    // Verify URL has no version param (viewing active version)
    expect(page.url()).not.toContain('version=');

    // ========================================
    // PART 9: Generate audio for the edited version
    // ========================================

    const generateAudioBtnAfterEdit = page.getByRole('button', {
      name: /generate audio/i,
    });
    if (await generateAudioBtnAfterEdit.isVisible()) {
      await generateAudioBtnAfterEdit.click();

      // Wait for audio generation to complete
      await expect(
        page
          .locator('.audio-player')
          .or(page.getByRole('button', { name: /play/i })),
      ).toBeVisible({ timeout: 60000 });
    }

    // Final verification: URL still has no version param
    expect(page.url()).not.toContain('version=');
  });
});

test.describe('Error Handling', () => {
  test.skip('shows error message on generation failure', async ({ page }) => {
    // This test would need the mock AI service to be configured to fail
    // which would require server-side configuration
    // Skipping for now as it needs mock error injection support
  });
});
