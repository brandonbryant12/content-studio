/**
 * Infographic Workbench E2E Tests
 *
 * Tests for the infographics workbench/detail page including:
 * - Loading workbench with infographic data
 * - Settings panel interactions
 * - Navigation and basic operations
 */

import { authenticatedTest as test, expect } from '../../fixtures';

test.describe('infographics workbench', () => {
  let documentId: string;
  let infographicId: string;

  test.beforeEach(async ({ api }) => {
    // Clean up any existing data
    await api.cleanupAll();

    // Create a test document
    const doc = await api.uploadDocument(
      'Test Document',
      'This is test content for infographic generation. It contains several key points about the topic. Here are more details about the subject matter that can be used for creating informative visuals.',
    );
    documentId = doc.id;

    // Create a test infographic
    const infographic = await api.createInfographic({
      title: 'Test Infographic',
      infographicType: 'timeline',
      documentIds: [documentId],
    });
    infographicId = infographic.id;
  });

  test.afterEach(async ({ api }) => {
    await api.cleanupAll();
  });

  test('loads workbench with infographic data', async ({
    infographicsPage,
    page,
  }) => {
    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    // Check title is displayed
    await expect(infographicsPage.getWorkbenchTitle()).toHaveText(
      'Test Infographic',
    );

    // Check status badge shows drafting
    await infographicsPage.expectStatusDrafting();
  });

  test('shows back button that navigates to list', async ({
    infographicsPage,
    page,
  }) => {
    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    // Click back button
    await page.locator('.workbench-back-btn').click();

    await expect(page).toHaveURL(/\/infographics$/);
  });

  test('can delete infographic from workbench', async ({
    infographicsPage,
    page,
    api,
  }) => {
    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    await infographicsPage.deleteFromWorkbench();

    // Should navigate back to list
    await expect(page).toHaveURL(/\/infographics$/);

    // Verify infographic is deleted
    const infographics = await api.listInfographics();
    expect(infographics.find((i) => i.id === infographicId)).toBeUndefined();
  });

  test('displays document content panel', async ({
    infographicsPage,
    page,
  }) => {
    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    // Check document content is visible
    const content = infographicsPage.getDocumentContent();
    await expect(content).toBeVisible();
    await expect(content).toContainText('test content');
  });

  test('shows empty selection state initially', async ({
    infographicsPage,
    page,
  }) => {
    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    await infographicsPage.expectSelectionsEmpty();
  });

  test('shows preview panel with empty state', async ({
    infographicsPage,
    page,
  }) => {
    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    await infographicsPage.expectPreviewEmpty();
  });

  test('shows action bar with generate button', async ({
    infographicsPage,
    page,
  }) => {
    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    const actionBar = infographicsPage.getActionBar();
    await expect(actionBar).toBeVisible();
    await expect(
      actionBar.getByRole('button', { name: /generate/i }),
    ).toBeVisible();
  });

  test('displays aspect ratio in header', async ({
    infographicsPage,
    page,
  }) => {
    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    // Check aspect ratio indicator is visible
    await expect(page.locator('.workbench-aspect-ratio')).toContainText('16:9');
  });

  test('displays infographic type subtitle', async ({
    infographicsPage,
    page,
  }) => {
    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    await expect(page.locator('.workbench-subtitle')).toContainText('Timeline');
  });
});

test.describe('infographics workbench settings', () => {
  let documentId: string;
  let infographicId: string;

  test.beforeEach(async ({ api }) => {
    await api.cleanupAll();

    const doc = await api.uploadDocument(
      'Settings Test Doc',
      'Content for testing settings panel functionality.',
    );
    documentId = doc.id;

    const infographic = await api.createInfographic({
      title: 'Settings Test',
      infographicType: 'comparison',
      documentIds: [documentId],
      aspectRatio: '1:1',
    });
    infographicId = infographic.id;
  });

  test.afterEach(async ({ api }) => {
    await api.cleanupAll();
  });

  test('can update custom instructions', async ({ infographicsPage, page }) => {
    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    await infographicsPage.fillCustomInstructions(
      'Use blue and green colors. Focus on data visualization.',
    );

    // Instructions should be saved (auto-save or blur)
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Reload and verify
    await page.reload();
    await infographicsPage.waitForWorkbench();

    const instructions = infographicsPage.getCustomInstructions();
    await expect(instructions).toHaveValue(/blue and green/);
  });
});
