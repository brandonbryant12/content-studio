import { authenticatedTest, expect } from '../../fixtures';

const uniqueVoiceoverName = () =>
  `GenTest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const openVoiceoverWithText = async (
  api: {
    createVoiceover: (input: { title: string; text: string }) => Promise<{
      id: string;
    }>;
  },
  page: { goto: (url: string) => Promise<void> },
  text: string,
) => {
  const voiceover = await api.createVoiceover({
    title: uniqueVoiceoverName(),
    text,
  });
  await page.goto(`/voiceovers/${voiceover.id}`);
};

authenticatedTest.describe('Voiceover Audio Generation', () => {
  authenticatedTest.beforeEach(async ({ api }) => {
    await api.deleteAllVoiceovers();
  });

  authenticatedTest.afterEach(async ({ api }) => {
    await api.deleteAllVoiceovers();
  });

  authenticatedTest(
    'starts generation from action bar and locks editing controls during processing',
    async ({ voiceoversPage, api, page }) => {
      await openVoiceoverWithText(
        api,
        page,
        'This is test voiceover content for audio generation.',
      );

      await voiceoversPage.clickGenerateAudio();

      await voiceoversPage.expectStatusGeneratingAudio();
      await voiceoversPage.expectActionBarGeneratingAudio();
      await expect(voiceoversPage.getTextEditor()).toBeDisabled();
      await expect(voiceoversPage.getDeleteButton()).toBeDisabled();
    },
  );

  authenticatedTest(
    'supports Save & Generate when unsaved text exists',
    async ({ voiceoversPage, api, page }) => {
      await openVoiceoverWithText(api, page, '');

      await voiceoversPage.enterText(
        'New voiceover text content for Save & Generate.',
      );
      await voiceoversPage.clickSaveAndGenerate();

      await voiceoversPage.expectStatusGeneratingAudio();
    },
  );

  authenticatedTest(
    'completes drafting -> generating -> ready transition and renders playable audio',
    async ({ voiceoversPage, api, page }) => {
      await openVoiceoverWithText(
        api,
        page,
        'Content for transition and audio player verification.',
      );

      await voiceoversPage.expectStatusDrafting();
      await voiceoversPage.clickGenerateAudio();
      await voiceoversPage.expectStatusGeneratingAudio();
      await voiceoversPage.expectStatusReady();

      await voiceoversPage.expectAudioPlayerVisible();
      const audioPlayer = voiceoversPage.getAudioPlayer();
      await expect(audioPlayer).toHaveAttribute('controls', '');
      await expect(audioPlayer).toHaveAttribute('src', /^https?:\/\//);
    },
  );

  authenticatedTest(
    'allows editing again after generation completes',
    async ({ voiceoversPage, api, page }) => {
      await openVoiceoverWithText(api, page, 'Original content.');

      await voiceoversPage.clickGenerateAudio();
      await voiceoversPage.expectStatusReady();

      await expect(voiceoversPage.getTextEditor()).toBeEnabled();
      await voiceoversPage.enterText('Updated content after generation.');
      await expect(
        voiceoversPage.getActionBar().getByText(/unsaved changes/i),
      ).toBeVisible();
    },
  );

  authenticatedTest(
    'can regenerate audio after editing and saving ready content',
    async ({ voiceoversPage, api, page }) => {
      await openVoiceoverWithText(api, page, 'Initial content.');

      await voiceoversPage.clickGenerateAudio();
      await voiceoversPage.expectStatusReady();

      await voiceoversPage.enterText('Updated content for second generation.');
      await voiceoversPage.clickSave();

      const generateButton = page.getByRole('button', {
        name: /generate audio/i,
      });
      if (await generateButton.isVisible()) {
        await generateButton.click();
      } else {
        await voiceoversPage.clickSaveAndGenerate();
      }

      await voiceoversPage.expectStatusGeneratingAudio();
    },
  );
});
