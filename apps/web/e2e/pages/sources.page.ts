/**
 * Sources Page Object
 *
 * Page object for the sources list page.
 * Route: /sources
 */

import { type Page, type Locator, expect } from '@playwright/test';
import path from 'node:path';
import { BasePage } from './base.page';

export class SourcesPage extends BasePage {
  readonly uploadButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);

    this.uploadButton = page.getByRole('button', { name: /upload/i });
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  /**
   * Navigate to the sources page
   */
  async goto(): Promise<void> {
    await this.page.goto('/sources');
    await this.waitForLoading();
  }

  /**
   * Verify the sources page is displayed
   */
  async expectVisible(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: 'Sources', level: 1 }),
    ).toBeVisible();
    await expect(this.uploadButton).toBeVisible();
  }

  /**
   * Search for sources
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
   * Open the upload dialog
   */
  async openUploadDialog(): Promise<void> {
    await this.uploadButton.click();
    await expect(this.getUploadDialog()).toBeVisible();
  }

  /**
   * Get the upload dialog
   */
  getUploadDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  /**
   * Upload a file
   */
  async uploadFile(filePath: string): Promise<void> {
    await this.openUploadDialog();

    const dialog = this.getUploadDialog();
    const fileInput = dialog.locator('input[type="file"]');

    // Set the file
    await fileInput.setInputFiles(filePath);

    // Wait for upload button to be enabled and click
    const uploadSubmitButton = dialog.getByRole('button', { name: /upload/i });
    await expect(uploadSubmitButton).toBeEnabled();
    await uploadSubmitButton.click();

    // Wait for dialog to close
    await expect(dialog).toBeHidden({ timeout: 10000 });
  }

  /**
   * Get all source items
   */
  getSourceItems(): Locator {
    return this.page
      .locator('[data-testid="source-item"]')
      .or(this.page.locator('a').filter({ hasText: /\.pdf|\.txt|\.doc/i }));
  }

  /**
   * Get a specific source by title
   */
  getSourceByTitle(title: string): Locator {
    return this.page.locator('a, div').filter({ hasText: title }).first();
  }

  /**
   * Delete a source by title
   */
  async deleteSource(title: string): Promise<void> {
    const sourceItem = this.getSourceByTitle(title);

    // Hover to reveal delete button (if using hover-to-show pattern)
    await sourceItem.hover();

    // Find and click the delete button
    const deleteButton = sourceItem
      .locator('button')
      .filter({ has: this.page.locator('svg') })
      .or(sourceItem.getByRole('button', { name: /delete/i }));

    await deleteButton.click();

    // Confirm deletion in dialog
    await this.confirmDialog();
  }

  /**
   * Check if a source exists in the list
   */
  async expectSourceVisible(title: string): Promise<void> {
    await expect(this.getSourceByTitle(title)).toBeVisible();
  }

  /**
   * Check if a source does not exist in the list
   */
  async expectSourceNotVisible(title: string): Promise<void> {
    await expect(this.getSourceByTitle(title)).toBeHidden();
  }

  /**
   * Check if the list is empty
   */
  async expectEmpty(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /no sources/i }),
    ).toBeVisible();
  }

  /**
   * Get the source count
   */
  async getSourceCount(): Promise<number> {
    const items = this.getSourceItems();
    return items.count();
  }
}
