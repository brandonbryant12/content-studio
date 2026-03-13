/**
 * Dashboard Page Object
 *
 * Page object for the dashboard page.
 * Route: /dashboard
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  readonly quickCreateToolbar: Locator;
  readonly uploadSourceAction: Locator;
  readonly newPodcastAction: Locator;
  readonly viewAllSourcesLink: Locator;
  readonly viewAllPodcastsLink: Locator;

  constructor(page: Page) {
    super(page);

    // Quick action buttons
    this.quickCreateToolbar = page.getByText(/quick create:/i).locator('..');
    this.uploadSourceAction = this.quickCreateToolbar.getByRole('button', {
      name: /^source$/i,
    });
    this.newPodcastAction = this.quickCreateToolbar.getByRole('button', {
      name: /^podcast$/i,
    });

    // View all links
    this.viewAllSourcesLink = page
      .locator('section')
      .filter({ hasText: /recent sources/i })
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
    await expect(
      this.page.getByRole('heading', { name: /dashboard/i }),
    ).toBeVisible();
    await expect(this.uploadSourceAction).toBeVisible();
    await expect(this.newPodcastAction).toBeVisible();
  }

  /**
   * Click the upload source action
   */
  async clickUploadSource(): Promise<void> {
    await this.uploadSourceAction.click();
  }

  /**
   * Click the new podcast action
   */
  async clickNewPodcast(): Promise<void> {
    await this.newPodcastAction.click();
  }

  /**
   * Navigate to all sources via the View all link
   */
  async goToAllSources(): Promise<void> {
    await this.viewAllSourcesLink.click();
    await this.page.waitForURL('**/sources');
  }

  /**
   * Navigate to all podcasts via the View all link
   */
  async goToAllPodcasts(): Promise<void> {
    await this.viewAllPodcastsLink.click();
    await this.page.waitForURL('**/podcasts');
  }

  /**
   * Get the recent sources section
   */
  getRecentSourcesSection(): Locator {
    return this.page.locator('section').filter({ hasText: /recent sources/i });
  }

  /**
   * Get the recent podcasts section
   */
  getRecentPodcastsSection(): Locator {
    return this.page.locator('section').filter({ hasText: /recent podcasts/i });
  }

  /**
   * Check if there are no sources
   */
  async expectNoSources(): Promise<void> {
    const section = this.getRecentSourcesSection();
    await expect(section.getByText(/no sources yet/i)).toBeVisible();
  }

  /**
   * Check if there are no podcasts
   */
  async expectNoPodcasts(): Promise<void> {
    const section = this.getRecentPodcastsSection();
    await expect(section.getByText(/no podcasts yet/i)).toBeVisible();
  }

  /**
   * Check if a source appears in the recent list
   */
  async expectSourceVisible(title: string): Promise<void> {
    const section = this.getRecentSourcesSection();
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
