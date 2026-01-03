/**
 * Dashboard Page Object
 *
 * Page object for the dashboard page.
 * Route: /dashboard
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  readonly uploadDocumentAction: Locator;
  readonly newPodcastAction: Locator;
  readonly viewAllDocumentsLink: Locator;
  readonly viewAllPodcastsLink: Locator;

  constructor(page: Page) {
    super(page);

    // Quick action buttons
    this.uploadDocumentAction = page.getByRole('button', {
      name: /upload document/i,
    });
    this.newPodcastAction = page.getByRole('button', { name: /new podcast/i });

    // View all links
    this.viewAllDocumentsLink = page
      .locator('section')
      .filter({ hasText: /recent documents/i })
      .getByRole('link', { name: /view all/i });
    this.viewAllPodcastsLink = page
      .locator('section')
      .filter({ hasText: /recent podcasts/i })
      .getByRole('link', { name: /view all/i });
  }

  /**
   * Navigate to the dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.waitForLoading();
  }

  /**
   * Verify the dashboard is displayed correctly
   */
  async expectVisible(): Promise<void> {
    await expect(this.page.getByText('Dashboard')).toBeVisible();
    await expect(this.uploadDocumentAction).toBeVisible();
    await expect(this.newPodcastAction).toBeVisible();
  }

  /**
   * Click the upload document action
   */
  async clickUploadDocument(): Promise<void> {
    await this.uploadDocumentAction.click();
  }

  /**
   * Click the new podcast action
   */
  async clickNewPodcast(): Promise<void> {
    await this.newPodcastAction.click();
  }

  /**
   * Navigate to all documents via the View all link
   */
  async goToAllDocuments(): Promise<void> {
    await this.viewAllDocumentsLink.click();
    await this.page.waitForURL('**/documents');
  }

  /**
   * Navigate to all podcasts via the View all link
   */
  async goToAllPodcasts(): Promise<void> {
    await this.viewAllPodcastsLink.click();
    await this.page.waitForURL('**/podcasts');
  }

  /**
   * Get the recent documents section
   */
  getRecentDocumentsSection(): Locator {
    return this.page.locator('section').filter({ hasText: /recent documents/i });
  }

  /**
   * Get the recent podcasts section
   */
  getRecentPodcastsSection(): Locator {
    return this.page.locator('section').filter({ hasText: /recent podcasts/i });
  }

  /**
   * Check if there are no documents
   */
  async expectNoDocuments(): Promise<void> {
    const section = this.getRecentDocumentsSection();
    await expect(section.getByText(/no documents yet/i)).toBeVisible();
  }

  /**
   * Check if there are no podcasts
   */
  async expectNoPodcasts(): Promise<void> {
    const section = this.getRecentPodcastsSection();
    await expect(section.getByText(/no podcasts yet/i)).toBeVisible();
  }

  /**
   * Check if a document appears in the recent list
   */
  async expectDocumentVisible(title: string): Promise<void> {
    const section = this.getRecentDocumentsSection();
    await expect(section.getByText(title)).toBeVisible();
  }

  /**
   * Check if a podcast appears in the recent list
   */
  async expectPodcastVisible(title: string): Promise<void> {
    const section = this.getRecentPodcastsSection();
    await expect(section.getByText(title)).toBeVisible();
  }

  /**
   * Wait for new podcast to be created and navigate
   */
  async createPodcastAndWait(): Promise<void> {
    await this.clickNewPodcast();
    await this.page.waitForURL('**/podcasts/**');
  }
}
