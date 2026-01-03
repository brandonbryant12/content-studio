/**
 * Base Page Object
 *
 * Contains common methods shared across all page objects.
 * All page objects should extend this class.
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Get a toast notification by its content
   * Uses Sonner's toast structure
   */
  getToast(message?: string): Locator {
    const toastSelector = '[data-sonner-toast]';
    if (message) {
      return this.page.locator(toastSelector).filter({ hasText: message });
    }
    return this.page.locator(toastSelector);
  }

  /**
   * Expect a success toast to appear with the given message
   */
  async expectSuccessToast(message: string): Promise<void> {
    const toast = this.getToast(message);
    await expect(toast).toBeVisible({ timeout: 5000 });
    // Sonner success toasts have data-type="success"
    await expect(toast).toHaveAttribute('data-type', 'success');
  }

  /**
   * Expect an error toast to appear with the given message
   */
  async expectErrorToast(message: string): Promise<void> {
    const toast = this.getToast(message);
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toHaveAttribute('data-type', 'error');
  }

  /**
   * Expect any toast to appear with the given message
   */
  async expectToast(message: string): Promise<void> {
    const toast = this.getToast(message);
    await expect(toast).toBeVisible({ timeout: 5000 });
  }

  /**
   * Dismiss all visible toasts by clicking them
   */
  async dismissToasts(): Promise<void> {
    const toasts = this.page.locator('[data-sonner-toast]');
    const count = await toasts.count();
    for (let i = 0; i < count; i++) {
      await toasts.nth(i).click();
    }
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the sidebar navigation
   */
  getSidebar(): Locator {
    return this.page
      .locator('[data-testid="sidebar"]')
      .or(this.page.locator('nav'));
  }

  /**
   * Navigate using sidebar link
   */
  async navigateVia(linkText: string): Promise<void> {
    const sidebar = this.getSidebar();
    await sidebar.getByRole('link', { name: linkText }).click();
    await this.waitForNavigation();
  }

  /**
   * Get the main content area
   */
  getMainContent(): Locator {
    return this.page.locator('main');
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoading(): Promise<void> {
    const spinner = this.page.locator('[data-testid="loading-spinner"]');
    // Wait for spinner to appear and disappear, or never appear
    try {
      await spinner.waitFor({ state: 'visible', timeout: 1000 });
      await spinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // Spinner never appeared, which is fine
    }
  }

  /**
   * Press keyboard shortcut
   */
  async pressShortcut(keys: string): Promise<void> {
    await this.page.keyboard.press(keys);
  }

  /**
   * Get a confirmation dialog
   */
  getConfirmationDialog(): Locator {
    return this.page.getByRole('alertdialog');
  }

  /**
   * Confirm a confirmation dialog
   */
  async confirmDialog(): Promise<void> {
    const dialog = this.getConfirmationDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /confirm|delete|yes/i }).click();
  }

  /**
   * Cancel a confirmation dialog
   */
  async cancelDialog(): Promise<void> {
    const dialog = this.getConfirmationDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /cancel|no/i }).click();
  }
}
