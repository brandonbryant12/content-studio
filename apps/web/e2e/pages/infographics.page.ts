/**
 * Infographics Page Object
 *
 * Page object for the infographics list and workbench pages.
 * Routes: /infographics, /infographics/new, /infographics/:id
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class InfographicsPage extends BasePage {
  readonly createButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);

    // Use "Create New" button in the header
    this.createButton = page.getByRole('button', { name: 'Create New' });
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  // ============================================================================
  // List Page Methods
  // ============================================================================

  /**
   * Navigate to the infographics list page
   */
  async goto(): Promise<void> {
    await this.page.goto('/infographics');
    await this.waitForLoading();
  }

  /**
   * Verify the infographics page is displayed
   */
  async expectVisible(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: 'Infographics', level: 1 }),
    ).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  /**
   * Create a new infographic from list page
   */
  async createInfographic(): Promise<void> {
    await this.createButton.click();
    // Wait for navigation to new infographic page
    await this.page.waitForURL('**/infographics/new');
  }

  /**
   * Search for infographics
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Debounce wait
    await this.page.waitForTimeout(300);
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get all infographic items in the list
   */
  getInfographicItems(): Locator {
    return this.page
      .locator('.list-card')
      .filter({ has: this.page.locator('a[href*="/infographics/"]') });
  }

  /**
   * Get a specific infographic by title
   */
  getInfographicByTitle(title: string): Locator {
    return this.page.locator('.list-card').filter({ hasText: title });
  }

  /**
   * Click on an infographic to navigate to its workbench
   */
  async openInfographic(title: string): Promise<void> {
    const item = this.getInfographicByTitle(title);
    await item.locator('a[href*="/infographics/"]').click();
    await this.page.waitForURL('**/infographics/**');
  }

  /**
   * Delete an infographic by title from the list
   */
  async deleteInfographic(title: string): Promise<void> {
    const item = this.getInfographicByTitle(title);

    // Hover to reveal delete button
    await item.hover();

    // Find and click the delete button
    const deleteButton = item.locator('button.btn-delete');
    await deleteButton.click();

    // Confirm deletion in dialog
    await this.confirmDialog();
  }

  /**
   * Check if an infographic exists in the list
   */
  async expectInfographicVisible(title: string): Promise<void> {
    await expect(this.getInfographicByTitle(title)).toBeVisible();
  }

  /**
   * Check if an infographic does not exist in the list
   */
  async expectInfographicNotVisible(title: string): Promise<void> {
    await expect(this.getInfographicByTitle(title)).toBeHidden();
  }

  /**
   * Check if the list is empty
   */
  async expectEmpty(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /no infographics/i }),
    ).toBeVisible();
  }

  /**
   * Get the infographic count
   */
  async getInfographicCount(): Promise<number> {
    const items = this.getInfographicItems();
    return items.count();
  }

  // ============================================================================
  // New Page Methods (Create Flow)
  // ============================================================================

  /**
   * Navigate to the new infographic page
   */
  async gotoNew(): Promise<void> {
    await this.page.goto('/infographics/new');
    await this.waitForLoading();
  }

  /**
   * Complete the create infographic form
   */
  async fillCreateForm(options: {
    title: string;
    type: string;
    documentTitle?: string;
  }): Promise<void> {
    const { title, type, documentTitle } = options;

    // Fill title
    await this.page.getByPlaceholder(/title/i).fill(title);

    // Select type
    await this.page
      .getByRole('button', { name: new RegExp(type, 'i') })
      .click();

    // Select document if provided
    if (documentTitle) {
      // Click the document checkbox/selector
      await this.page.getByText(documentTitle).click();
    }
  }

  /**
   * Submit the create form
   */
  async submitCreateForm(): Promise<void> {
    await this.page.getByRole('button', { name: /create/i }).click();
    await this.page.waitForURL('**/infographics/inf_*');
  }

  // ============================================================================
  // Workbench Methods
  // ============================================================================

  /**
   * Wait for workbench to load
   */
  async waitForWorkbench(): Promise<void> {
    await expect(this.page.locator('.workbench-panel-left')).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * Get the status badge in the workbench header
   */
  getStatusBadge(): Locator {
    return this.page.locator('.workbench-meta > span').first();
  }

  /**
   * Check if status badge shows "Drafting"
   */
  async expectStatusDrafting(): Promise<void> {
    await expect(
      this.page.locator('.workbench-meta').getByText(/drafting/i),
    ).toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if status badge shows "Generating"
   */
  async expectStatusGenerating(): Promise<void> {
    await expect(
      this.page.locator('.workbench-meta').getByText(/generating/i),
    ).toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if status badge shows "Ready"
   */
  async expectStatusReady(): Promise<void> {
    await expect(
      this.page.locator('.workbench-meta').getByText(/^ready$/i),
    ).toBeVisible({ timeout: 30000 });
  }

  /**
   * Check if status badge shows "Failed"
   */
  async expectStatusFailed(): Promise<void> {
    await expect(
      this.page.locator('.workbench-meta').getByText(/failed/i),
    ).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get the global action bar
   */
  getActionBar(): Locator {
    return this.page.locator('.global-action-bar');
  }

  /**
   * Get the workbench title
   */
  getWorkbenchTitle(): Locator {
    return this.page.locator('.workbench-title');
  }

  /**
   * Delete the current infographic from workbench
   */
  async deleteFromWorkbench(): Promise<void> {
    await this.page.locator('.workbench-delete-btn').click();
    await this.confirmDialog();
  }

  // ============================================================================
  // Document Panel Methods
  // ============================================================================

  /**
   * Get the document tabs
   */
  getDocumentTabs(): Locator {
    return this.page.locator('.document-tabs');
  }

  /**
   * Switch to a document tab
   */
  async switchDocumentTab(documentTitle: string): Promise<void> {
    await this.page
      .locator('.document-tab')
      .filter({ hasText: documentTitle })
      .click();
  }

  /**
   * Get the document content panel
   */
  getDocumentContent(): Locator {
    return this.page.locator('.text-highlighter-content');
  }

  /**
   * Add a document to the workbench
   */
  async addDocument(): Promise<void> {
    await this.page.getByRole('button', { name: /add document/i }).click();
  }

  // ============================================================================
  // Text Selection Methods
  // ============================================================================

  /**
   * Select text in the document content
   * Simulates click-and-drag to select text
   */
  async selectText(text: string): Promise<void> {
    const content = this.getDocumentContent();

    // Find the text node containing the target text
    const textLocator = content.getByText(text, { exact: false });

    // Get the bounding box
    const box = await textLocator.boundingBox();
    if (!box) throw new Error(`Could not find text: ${text}`);

    // Perform selection: click at start, drag to end
    await this.page.mouse.move(box.x, box.y + box.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + box.width, box.y + box.height / 2);
    await this.page.mouse.up();
  }

  /**
   * Click the "Add Selection" button that appears after selecting text
   */
  async clickAddSelection(): Promise<void> {
    await this.page
      .locator('.selection-popup')
      .getByRole('button', { name: /add selection/i })
      .click();
  }

  /**
   * Get existing highlights in the document
   */
  getHighlights(): Locator {
    return this.page.locator('.selection-highlight');
  }

  /**
   * Remove a highlight by clicking it
   */
  async removeHighlight(index: number): Promise<void> {
    const highlights = this.getHighlights();
    const highlight = highlights.nth(index);
    await highlight.locator('.selection-highlight-remove').click();
  }

  // ============================================================================
  // Selection List Methods
  // ============================================================================

  /**
   * Get the selection list
   */
  getSelectionList(): Locator {
    return this.page.locator('.selection-list');
  }

  /**
   * Get all selection items
   */
  getSelectionItems(): Locator {
    return this.page.locator('.selection-item');
  }

  /**
   * Get the selection count
   */
  async getSelectionCount(): Promise<number> {
    return this.getSelectionItems().count();
  }

  /**
   * Get the empty state for selections
   */
  getSelectionEmptyState(): Locator {
    return this.page.locator('.selection-list-empty');
  }

  /**
   * Check if selection list shows empty state
   */
  async expectSelectionsEmpty(): Promise<void> {
    await expect(this.getSelectionEmptyState()).toBeVisible();
  }

  /**
   * Check if selection warning is visible (> 10 selections)
   */
  async expectSelectionWarning(): Promise<void> {
    await expect(this.page.locator('.selection-list-warning')).toBeVisible();
  }

  /**
   * Remove a selection by index (0-based)
   */
  async removeSelection(index: number): Promise<void> {
    const item = this.getSelectionItems().nth(index);
    await item.locator('.selection-item-remove').click();
  }

  // ============================================================================
  // AI Suggestions Methods
  // ============================================================================

  /**
   * Click extract key points button
   */
  async extractKeyPoints(): Promise<void> {
    await this.page
      .getByRole('button', { name: /extract key points/i })
      .click();
  }

  /**
   * Get AI suggestions
   */
  getAISuggestions(): Locator {
    return this.page.locator('.ai-suggestion-item');
  }

  /**
   * Add an AI suggestion by index
   */
  async addAISuggestion(index: number): Promise<void> {
    const suggestion = this.getAISuggestions().nth(index);
    await suggestion.getByRole('button', { name: /add/i }).click();
  }

  /**
   * Add all high relevance AI suggestions
   */
  async addAllHighRelevanceSuggestions(): Promise<void> {
    await this.page.getByRole('button', { name: /add all/i }).click();
  }

  // ============================================================================
  // Settings Panel Methods
  // ============================================================================

  /**
   * Select an infographic type
   */
  async selectType(type: string): Promise<void> {
    await this.page
      .locator('.type-card')
      .filter({ hasText: new RegExp(type, 'i') })
      .click();
  }

  /**
   * Select an aspect ratio
   */
  async selectAspectRatio(ratio: string): Promise<void> {
    await this.page
      .locator('.aspect-ratio-option')
      .filter({ hasText: ratio })
      .click();
  }

  /**
   * Get the custom instructions textarea
   */
  getCustomInstructions(): Locator {
    return this.page
      .locator('textarea[placeholder*="instructions"]')
      .or(this.page.getByLabel(/custom instructions/i));
  }

  /**
   * Fill custom instructions
   */
  async fillCustomInstructions(text: string): Promise<void> {
    const textarea = this.getCustomInstructions();
    await textarea.fill(text);
  }

  /**
   * Get the feedback instructions textarea (shown after generation)
   */
  getFeedbackInstructions(): Locator {
    return this.page
      .locator('textarea[placeholder*="feedback"]')
      .or(this.page.getByLabel(/feedback/i));
  }

  /**
   * Fill feedback instructions for regeneration
   */
  async fillFeedbackInstructions(text: string): Promise<void> {
    const textarea = this.getFeedbackInstructions();
    await textarea.fill(text);
  }

  // ============================================================================
  // Preview Panel Methods
  // ============================================================================

  /**
   * Get the preview panel
   */
  getPreviewPanel(): Locator {
    return this.page.locator('.preview-panel');
  }

  /**
   * Get the preview image
   */
  getPreviewImage(): Locator {
    return this.page.locator('.preview-panel-image');
  }

  /**
   * Check if preview shows empty state
   */
  async expectPreviewEmpty(): Promise<void> {
    await expect(this.page.locator('.preview-panel-empty')).toBeVisible();
  }

  /**
   * Check if preview shows generating state
   */
  async expectPreviewGenerating(): Promise<void> {
    await expect(this.page.locator('.preview-panel-loading')).toBeVisible();
  }

  /**
   * Check if preview shows error state
   */
  async expectPreviewError(): Promise<void> {
    await expect(this.page.locator('.preview-panel-error')).toBeVisible();
  }

  /**
   * Check if preview shows the generated image
   */
  async expectPreviewImage(): Promise<void> {
    await expect(this.getPreviewImage()).toBeVisible({ timeout: 60000 });
  }

  /**
   * Click download button
   */
  async downloadInfographic(): Promise<void> {
    await this.page.locator('.preview-panel-download').click();
  }

  /**
   * Zoom in on preview
   */
  async zoomIn(): Promise<void> {
    await this.page.getByRole('button', { name: /zoom in/i }).click();
  }

  /**
   * Zoom out on preview
   */
  async zoomOut(): Promise<void> {
    await this.page.getByRole('button', { name: /zoom out/i }).click();
  }

  /**
   * Reset zoom
   */
  async resetZoom(): Promise<void> {
    await this.page.getByRole('button', { name: /reset zoom/i }).click();
  }

  // ============================================================================
  // Generation Methods
  // ============================================================================

  /**
   * Click generate button
   */
  async clickGenerate(): Promise<void> {
    await this.getActionBar()
      .getByRole('button', { name: /generate/i })
      .click();
  }

  /**
   * Click regenerate button
   */
  async clickRegenerate(): Promise<void> {
    await this.getActionBar()
      .getByRole('button', { name: /regenerate/i })
      .click();
  }

  /**
   * Wait for generation to complete (polls until status is ready or failed)
   */
  async waitForGeneration(timeout = 60000): Promise<void> {
    // Wait for status to change from generating
    await expect(
      this.page.locator('.workbench-meta').getByText(/ready|failed/i),
    ).toBeVisible({ timeout });
  }

  /**
   * Complete generation flow: click generate and wait for result
   */
  async generateAndWait(): Promise<void> {
    await this.clickGenerate();
    await this.expectStatusGenerating();
    await this.waitForGeneration();
  }
}
