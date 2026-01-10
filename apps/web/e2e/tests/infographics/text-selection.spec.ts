/**
 * Text Selection E2E Tests
 *
 * Tests for text selection functionality in the infographics workbench:
 * - Selecting text from documents
 * - Adding/removing selections
 * - Selection list management
 * - Selection limits and warnings
 */

import { authenticatedTest as test, expect } from '../../fixtures';

test.describe('infographics text selection', () => {
  let documentId: string;
  let infographicId: string;
  const sampleContent =
    'This is the first paragraph with important information. ' +
    'The second sentence contains key data points for analysis. ' +
    'Finally, the third sentence summarizes the main conclusions.';

  test.beforeEach(async ({ api }) => {
    await api.cleanupAll();

    // Create a document with predictable content
    const doc = await api.uploadDocument('Selection Test Doc', sampleContent);
    documentId = doc.id;

    // Create infographic
    const infographic = await api.createInfographic({
      title: 'Selection Test',
      infographicType: 'timeline',
      documentIds: [documentId],
    });
    infographicId = infographic.id;
  });

  test.afterEach(async ({ api }) => {
    await api.cleanupAll();
  });

  test('can add a selection via API and see it highlighted', async ({
    infographicsPage,
    page,
    api,
  }) => {
    // Add a selection via API
    await api.addSelection(infographicId, {
      documentId,
      selectedText: 'important information',
      startOffset: 39,
      endOffset: 60,
    });

    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    // Should see the highlight in the document
    const highlights = infographicsPage.getHighlights();
    await expect(highlights).toHaveCount(1);
    await expect(highlights.first()).toContainText('important information');

    // Should see the selection in the list
    const selectionItems = infographicsPage.getSelectionItems();
    await expect(selectionItems).toHaveCount(1);
  });

  test('displays selection in the selection list', async ({
    infographicsPage,
    page,
    api,
  }) => {
    await api.addSelection(infographicId, {
      documentId,
      selectedText: 'key data points',
    });

    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    const selectionItems = infographicsPage.getSelectionItems();
    await expect(selectionItems).toHaveCount(1);
    await expect(selectionItems.first()).toContainText('key data points');
  });

  test('can remove a selection from the list', async ({
    infographicsPage,
    page,
    api,
  }) => {
    await api.addSelection(infographicId, {
      documentId,
      selectedText: 'first paragraph',
    });

    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    // Verify selection exists
    const selectionItems = infographicsPage.getSelectionItems();
    await expect(selectionItems).toHaveCount(1);

    // Remove the selection
    await infographicsPage.removeSelection(0);

    // Should be removed
    await expect(selectionItems).toHaveCount(0);
    await infographicsPage.expectSelectionsEmpty();
  });

  test('shows selection count in header', async ({
    infographicsPage,
    page,
    api,
  }) => {
    await api.addSelection(infographicId, {
      documentId,
      selectedText: 'first paragraph',
    });
    await api.addSelection(infographicId, {
      documentId,
      selectedText: 'key data points',
    });
    await api.addSelection(infographicId, {
      documentId,
      selectedText: 'main conclusions',
    });

    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    // Should show count
    await expect(
      page.locator('.selection-list-count'),
    ).toContainText('3 selections');
  });

  test('shows warning when over selection limit', async ({
    infographicsPage,
    page,
    api,
  }) => {
    // Add 11 selections (over the soft limit of 10)
    for (let i = 0; i < 11; i++) {
      await api.addSelection(infographicId, {
        documentId,
        selectedText: `Selection ${i + 1}`,
      });
    }

    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    // Should show warning
    await infographicsPage.expectSelectionWarning();
  });

  test('preserves selection order after reload', async ({
    infographicsPage,
    page,
    api,
  }) => {
    // Add selections in specific order
    await api.addSelection(infographicId, {
      documentId,
      selectedText: 'First item',
    });
    await api.addSelection(infographicId, {
      documentId,
      selectedText: 'Second item',
    });
    await api.addSelection(infographicId, {
      documentId,
      selectedText: 'Third item',
    });

    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    // Check order
    const items = infographicsPage.getSelectionItems();
    await expect(items.nth(0)).toContainText('First item');
    await expect(items.nth(1)).toContainText('Second item');
    await expect(items.nth(2)).toContainText('Third item');

    // Reload and verify order is preserved
    await page.reload();
    await infographicsPage.waitForWorkbench();

    await expect(items.nth(0)).toContainText('First item');
    await expect(items.nth(1)).toContainText('Second item');
    await expect(items.nth(2)).toContainText('Third item');
  });

  test('shows document title for each selection', async ({
    infographicsPage,
    page,
    api,
  }) => {
    await api.addSelection(infographicId, {
      documentId,
      selectedText: 'important information',
    });

    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    const selectionItem = infographicsPage.getSelectionItems().first();
    // Should show the document title
    await expect(selectionItem.locator('.selection-item-meta')).toContainText(
      'Selection Test Doc',
    );
  });

  test('truncates long selection text in preview', async ({
    infographicsPage,
    page,
    api,
  }) => {
    // Add a very long selection
    const longText =
      'This is a very long piece of text that should be truncated in the selection list preview. ' +
      'It contains many words and spans multiple sentences to ensure it exceeds the preview limit. ' +
      'The full text should still be stored but the preview should be shortened for display purposes.';

    await api.addSelection(infographicId, {
      documentId,
      selectedText: longText,
    });

    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    const selectionItem = infographicsPage.getSelectionItems().first();
    const text = await selectionItem.locator('.selection-item-text').textContent();

    // Should be truncated (ends with ...)
    expect(text).toMatch(/\.\.\.$/);
    // Should be shorter than original
    expect(text?.length).toBeLessThan(longText.length);
  });
});

test.describe('infographics selection reordering', () => {
  let documentId: string;
  let infographicId: string;

  test.beforeEach(async ({ api }) => {
    await api.cleanupAll();

    const doc = await api.uploadDocument(
      'Reorder Test Doc',
      'Content for testing reorder functionality.',
    );
    documentId = doc.id;

    const infographic = await api.createInfographic({
      title: 'Reorder Test',
      infographicType: 'list',
      documentIds: [documentId],
    });
    infographicId = infographic.id;
  });

  test.afterEach(async ({ api }) => {
    await api.cleanupAll();
  });

  test('can reorder selections via API', async ({ api }) => {
    // Add selections
    const sel1 = await api.addSelection(infographicId, {
      documentId,
      selectedText: 'Item A',
    });
    const sel2 = await api.addSelection(infographicId, {
      documentId,
      selectedText: 'Item B',
    });
    const sel3 = await api.addSelection(infographicId, {
      documentId,
      selectedText: 'Item C',
    });

    // Reorder: C, A, B
    const result = await api.reorderSelections(infographicId, [
      sel3.selection.id,
      sel1.selection.id,
      sel2.selection.id,
    ]);

    // Verify new order
    expect(result.selections[0].selectedText).toBe('Item C');
    expect(result.selections[1].selectedText).toBe('Item A');
    expect(result.selections[2].selectedText).toBe('Item B');
  });

  test('reordered selections display correctly in UI', async ({
    infographicsPage,
    page,
    api,
  }) => {
    const sel1 = await api.addSelection(infographicId, {
      documentId,
      selectedText: 'First',
    });
    const sel2 = await api.addSelection(infographicId, {
      documentId,
      selectedText: 'Second',
    });
    const sel3 = await api.addSelection(infographicId, {
      documentId,
      selectedText: 'Third',
    });

    // Reorder via API: Third, First, Second
    await api.reorderSelections(infographicId, [
      sel3.selection.id,
      sel1.selection.id,
      sel2.selection.id,
    ]);

    await page.goto(`/infographics/${infographicId}`);
    await infographicsPage.waitForWorkbench();

    const items = infographicsPage.getSelectionItems();
    await expect(items.nth(0)).toContainText('Third');
    await expect(items.nth(1)).toContainText('First');
    await expect(items.nth(2)).toContainText('Second');
  });
});
