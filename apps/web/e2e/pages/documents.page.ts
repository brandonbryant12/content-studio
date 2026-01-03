/**
 * Documents Page Object
 *
 * Page object for the documents list page.
 * Route: /documents
 */

import { type Page, type Locator, expect } from '@playwright/test';
import path from 'node:path';
import { BasePage } from './base.page';

export class DocumentsPage extends BasePage {
  readonly uploadButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);

    this.uploadButton = page.getByRole('button', { name: /upload/i });
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  /**
   * Navigate to the documents page
   */
  async goto(): Promise<void> {
    await this.page.goto('/documents');
    await this.waitForLoading();
  }

  /**
   * Verify the documents page is displayed
   */
  async expectVisible(): Promise<void> {
    await expect(this.page.getByText('Documents')).toBeVisible();
    await expect(this.uploadButton).toBeVisible();
  }

  /**
   * Search for documents
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
   * Get all document items
   */
  getDocumentItems(): Locator {
    return this.page.locator('[data-testid="document-item"]').or(
      this.page.locator('a').filter({ hasText: /\.pdf|\.txt|\.doc/i }),
    );
  }

  /**
   * Get a specific document by title
   */
  getDocumentByTitle(title: string): Locator {
    return this.page.locator('a, div').filter({ hasText: title }).first();
  }

  /**
   * Delete a document by title
   */
  async deleteDocument(title: string): Promise<void> {
    const docItem = this.getDocumentByTitle(title);

    // Hover to reveal delete button (if using hover-to-show pattern)
    await docItem.hover();

    // Find and click the delete button
    const deleteButton = docItem
      .locator('button')
      .filter({ has: this.page.locator('svg') })
      .or(docItem.getByRole('button', { name: /delete/i }));

    await deleteButton.click();

    // Confirm deletion in dialog
    await this.confirmDialog();
  }

  /**
   * Check if a document exists in the list
   */
  async expectDocumentVisible(title: string): Promise<void> {
    await expect(this.getDocumentByTitle(title)).toBeVisible();
  }

  /**
   * Check if a document does not exist in the list
   */
  async expectDocumentNotVisible(title: string): Promise<void> {
    await expect(this.getDocumentByTitle(title)).toBeHidden();
  }

  /**
   * Check if the list is empty
   */
  async expectEmpty(): Promise<void> {
    await expect(
      this.page.getByText(/no documents/i).or(this.page.getByText(/upload.*first/i)),
    ).toBeVisible();
  }

  /**
   * Get the document count
   */
  async getDocumentCount(): Promise<number> {
    const items = this.getDocumentItems();
    return items.count();
  }
}
