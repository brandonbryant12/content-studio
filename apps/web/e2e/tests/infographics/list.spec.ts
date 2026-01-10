/**
 * Infographic List E2E Tests
 *
 * Tests for the infographics list page including:
 * - Viewing list of infographics
 * - Creating new infographics
 * - Deleting infographics
 * - Search/filtering
 */

import { authenticatedTest as test, expect } from '../../fixtures';

test.describe('infographics list', () => {
  let documentId: string;

  test.beforeEach(async ({ api }) => {
    // Clean up any existing data
    await api.cleanupAll();

    // Create a test document for infographic creation
    const doc = await api.uploadDocument(
      'Test Document',
      'This is test content for infographic generation. It contains several key points about the topic.',
    );
    documentId = doc.id;
  });

  test.afterEach(async ({ api }) => {
    await api.cleanupAll();
  });

  test('displays empty state when no infographics exist', async ({
    infographicsPage,
  }) => {
    await infographicsPage.goto();

    await infographicsPage.expectVisible();
    await infographicsPage.expectEmpty();
  });

  test('displays list of infographics', async ({ infographicsPage, api }) => {
    // Create test infographics via API
    await api.createInfographic({
      title: 'Timeline Infographic',
      infographicType: 'timeline',
      documentIds: [documentId],
    });
    await api.createInfographic({
      title: 'Comparison Chart',
      infographicType: 'comparison',
      documentIds: [documentId],
    });

    await infographicsPage.goto();

    await infographicsPage.expectVisible();
    await infographicsPage.expectInfographicVisible('Timeline Infographic');
    await infographicsPage.expectInfographicVisible('Comparison Chart');

    const count = await infographicsPage.getInfographicCount();
    expect(count).toBe(2);
  });

  test('can search infographics by title', async ({ infographicsPage, api }) => {
    // Create test infographics
    await api.createInfographic({
      title: 'Project Timeline',
      infographicType: 'timeline',
      documentIds: [documentId],
    });
    await api.createInfographic({
      title: 'Sales Comparison',
      infographicType: 'comparison',
      documentIds: [documentId],
    });
    await api.createInfographic({
      title: 'Process Flow Diagram',
      infographicType: 'process',
      documentIds: [documentId],
    });

    await infographicsPage.goto();

    // Search for "Timeline"
    await infographicsPage.search('Timeline');

    await infographicsPage.expectInfographicVisible('Project Timeline');
    await infographicsPage.expectInfographicNotVisible('Sales Comparison');
    await infographicsPage.expectInfographicNotVisible('Process Flow Diagram');

    // Clear and search for "Comparison"
    await infographicsPage.clearSearch();
    await infographicsPage.search('Comparison');

    await infographicsPage.expectInfographicNotVisible('Project Timeline');
    await infographicsPage.expectInfographicVisible('Sales Comparison');
    await infographicsPage.expectInfographicNotVisible('Process Flow Diagram');
  });

  test('navigates to create page when clicking create button', async ({
    infographicsPage,
    page,
  }) => {
    await infographicsPage.goto();
    await infographicsPage.createInfographic();

    await expect(page).toHaveURL(/\/infographics\/new/);
  });

  test('can delete an infographic from the list', async ({
    infographicsPage,
    api,
  }) => {
    // Create test infographic
    await api.createInfographic({
      title: 'To Be Deleted',
      infographicType: 'timeline',
      documentIds: [documentId],
    });

    await infographicsPage.goto();
    await infographicsPage.expectInfographicVisible('To Be Deleted');

    // Delete the infographic
    await infographicsPage.deleteInfographic('To Be Deleted');

    // Should show success toast and infographic should be gone
    await infographicsPage.expectToast('deleted');
    await infographicsPage.expectInfographicNotVisible('To Be Deleted');
  });

  test('can navigate to infographic workbench from list', async ({
    infographicsPage,
    api,
    page,
  }) => {
    // Create test infographic
    const infographic = await api.createInfographic({
      title: 'Click Me',
      infographicType: 'timeline',
      documentIds: [documentId],
    });

    await infographicsPage.goto();
    await infographicsPage.openInfographic('Click Me');

    await expect(page).toHaveURL(
      new RegExp(`/infographics/${infographic.id}`),
    );
    await infographicsPage.waitForWorkbench();
  });

  test('shows infographic type badge on list items', async ({
    infographicsPage,
    api,
    page,
  }) => {
    await api.createInfographic({
      title: 'My Timeline',
      infographicType: 'timeline',
      documentIds: [documentId],
    });

    await infographicsPage.goto();

    const item = infographicsPage.getInfographicByTitle('My Timeline');
    await expect(item.getByText('Timeline')).toBeVisible();
  });

  test('shows status badge on list items', async ({
    infographicsPage,
    api,
    page,
  }) => {
    await api.createInfographic({
      title: 'Draft Infographic',
      infographicType: 'statistical',
      documentIds: [documentId],
    });

    await infographicsPage.goto();

    const item = infographicsPage.getInfographicByTitle('Draft Infographic');
    await expect(item.getByText(/drafting/i)).toBeVisible();
  });
});
