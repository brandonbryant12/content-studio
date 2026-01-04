/**
 * Voiceover Generation E2E Tests
 *
 * Tests for audio generation functionality:
 * - Generate audio for a voiceover
 * - Shows generating status
 * - Shows audio player when complete
 */

import { authenticatedTest, expect } from '../../fixtures';

// Generate unique voiceover name for each test run to avoid conflicts
const uniqueVoiceoverName = () =>
  `GenTest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

authenticatedTest.describe('Voiceover Audio Generation', () => {
  authenticatedTest.beforeEach(async ({ api }) => {
    // Clean up voiceovers before each test
    await api.deleteAllVoiceovers();
  });

  authenticatedTest.afterEach(async ({ api }) => {
    // Clean up after each test
    await api.deleteAllVoiceovers();
  });

  // ============================================================================
  // Generation Trigger Tests
  // ============================================================================

  authenticatedTest.describe('Trigger Generation', () => {
    authenticatedTest(
      'shows Generate Audio button when voiceover has text',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'This is test voiceover content for generation.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Should show Generate Audio button in action bar
        const generateButton = page.getByRole('button', {
          name: /generate audio/i,
        });
        await expect(generateButton).toBeVisible();
      },
    );

    authenticatedTest(
      'can trigger generation from action bar',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'This is test voiceover content for audio generation testing.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Click Generate Audio
        await voiceoversPage.clickGenerateAudio();

        // Should show generating status
        await voiceoversPage.expectStatusGeneratingAudio();
      },
    );

    authenticatedTest(
      'Save & Generate triggers generation when there are changes',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover without text via API
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: '',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Enter text (creates unsaved changes)
        await voiceoversPage.enterText(
          'New voiceover text content for Save & Generate test.',
        );

        // Click Save & Generate
        await voiceoversPage.clickSaveAndGenerate();

        // Should show generating status
        await voiceoversPage.expectStatusGeneratingAudio();
      },
    );
  });

  // ============================================================================
  // Generating Status Tests
  // ============================================================================

  authenticatedTest.describe('Generating Status', () => {
    authenticatedTest(
      'shows "Generating Audio" status in header badge',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'Content for status badge test during generation.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Trigger generation
        await voiceoversPage.clickGenerateAudio();

        // Status badge should show "Generating Audio"
        await voiceoversPage.expectStatusGeneratingAudio();
      },
    );

    authenticatedTest(
      'shows "Generating audio..." in action bar',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'Content for action bar status test.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Trigger generation
        await voiceoversPage.clickGenerateAudio();

        // Action bar should show generating status
        await voiceoversPage.expectActionBarGeneratingAudio();
      },
    );

    authenticatedTest(
      'disables text editor during generation',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'Content for disabled editor test.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Trigger generation
        await voiceoversPage.clickGenerateAudio();

        // Text editor should be disabled
        const editor = voiceoversPage.getTextEditor();
        await expect(editor).toBeDisabled();
      },
    );

    authenticatedTest(
      'disables delete button during generation',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'Content for disabled delete button test.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Trigger generation
        await voiceoversPage.clickGenerateAudio();

        // Delete button should be disabled
        const deleteButton = voiceoversPage.getDeleteButton();
        await expect(deleteButton).toBeDisabled();
      },
    );
  });

  // ============================================================================
  // Audio Player Tests
  // ============================================================================

  authenticatedTest.describe('Audio Player', () => {
    // Note: These tests may require the generation to complete, which may
    // take longer than the test timeout in a real environment.
    // They are designed to verify the UI elements appear correctly.

    authenticatedTest(
      'shows audio player when voiceover is ready',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'Test content for audio player visibility.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Trigger generation and wait for completion
        await voiceoversPage.clickGenerateAudio();

        // Wait for status to change to Ready (with longer timeout for actual generation)
        await voiceoversPage.expectStatusReady();

        // Audio player should be visible
        await voiceoversPage.expectAudioPlayerVisible();
      },
    );

    authenticatedTest(
      'audio player has controls',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'Test content for audio player controls.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Trigger generation and wait for completion
        await voiceoversPage.clickGenerateAudio();
        await voiceoversPage.expectStatusReady();

        // Audio player should have controls attribute
        const audioPlayer = voiceoversPage.getAudioPlayer();
        await expect(audioPlayer).toHaveAttribute('controls', '');
      },
    );

    authenticatedTest(
      'audio player has source URL',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'Test content for audio source URL.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Trigger generation and wait for completion
        await voiceoversPage.clickGenerateAudio();
        await voiceoversPage.expectStatusReady();

        // Audio player should have a src attribute
        const audioPlayer = voiceoversPage.getAudioPlayer();
        const src = await audioPlayer.getAttribute('src');
        expect(src).toBeTruthy();
        expect(src).toMatch(/^https?:\/\//);
      },
    );
  });

  // ============================================================================
  // Status Transition Tests
  // ============================================================================

  authenticatedTest.describe('Status Transitions', () => {
    authenticatedTest(
      'transitions from Drafting to Generating Audio to Ready',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text (starts in drafting)
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'Content for full status transition test.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Should start as Drafting
        await voiceoversPage.expectStatusDrafting();

        // Trigger generation
        await voiceoversPage.clickGenerateAudio();

        // Should transition to Generating Audio
        await voiceoversPage.expectStatusGeneratingAudio();

        // Should eventually transition to Ready
        await voiceoversPage.expectStatusReady();
      },
    );

    authenticatedTest(
      'can edit voiceover after generation completes',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'Original content for re-edit test.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Complete generation
        await voiceoversPage.clickGenerateAudio();
        await voiceoversPage.expectStatusReady();

        // Text editor should be enabled again
        const editor = voiceoversPage.getTextEditor();
        await expect(editor).toBeEnabled();

        // Can edit text
        await voiceoversPage.enterText('Updated content after generation.');

        // Should show unsaved changes
        await expect(
          voiceoversPage.getActionBar().getByText(/unsaved changes/i),
        ).toBeVisible();
      },
    );

    authenticatedTest(
      'can regenerate audio after editing',
      async ({ voiceoversPage, api, page }) => {
        // Create a voiceover with text
        const title = uniqueVoiceoverName();
        const voiceover = await api.createVoiceover({
          title,
          text: 'Initial content for regeneration test.',
        });

        await page.goto(`/voiceovers/${voiceover.id}`);

        // Complete first generation
        await voiceoversPage.clickGenerateAudio();
        await voiceoversPage.expectStatusReady();

        // Edit the text
        await voiceoversPage.enterText(
          'Updated content for second generation.',
        );

        // Click Save (since status is Ready)
        await voiceoversPage.clickSave();

        // Can trigger regeneration via Generate Audio button
        // After saving, the button should be available
        const generateButton = page.getByRole('button', {
          name: /generate audio/i,
        });

        // If visible, click it; otherwise use Save & Generate
        if (await generateButton.isVisible()) {
          await generateButton.click();
        } else {
          await voiceoversPage.clickSaveAndGenerate();
        }

        // Should show generating status again
        await voiceoversPage.expectStatusGeneratingAudio();
      },
    );
  });
});
