/**
 * Podcasts Page Object
 *
 * Page object for the podcasts list page.
 * Route: /podcasts
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class PodcastsPage extends BasePage {
  readonly createButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);

    // Use "Create New" button in the header (not "Create Podcast" in empty state)
    this.createButton = page.getByRole('button', { name: 'Create New' });
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  /**
   * Navigate to the podcasts page
   */
  async goto(): Promise<void> {
    await this.page.goto('/podcasts');
    await this.waitForLoading();
  }

  /**
   * Verify the podcasts page is displayed
   */
  async expectVisible(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: 'Podcasts', level: 1 }),
    ).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  /**
   * Create a new podcast
   */
  async createPodcast(): Promise<void> {
    await this.createButton.click();
    // Wait for navigation to new podcast page
    await this.page.waitForURL('**/podcasts/**');
  }

  /**
   * Search for podcasts
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
   * Get all podcast items
   */
  getPodcastItems(): Locator {
    return this.page
      .locator('[data-testid="podcast-item"]')
      .or(this.page.locator('a[href*="/podcasts/"]'));
  }

  /**
   * Get a specific podcast by title
   */
  getPodcastByTitle(title: string): Locator {
    return this.page.locator('a, div').filter({ hasText: title }).first();
  }

  /**
   * Click on a podcast to navigate to its detail page
   */
  async openPodcast(title: string): Promise<void> {
    const podcastItem = this.getPodcastByTitle(title);
    await podcastItem.click();
    await this.page.waitForURL('**/podcasts/**');
  }

  /**
   * Delete a podcast by title
   */
  async deletePodcast(title: string): Promise<void> {
    const podcastItem = this.getPodcastByTitle(title);

    // Hover to reveal delete button
    await podcastItem.hover();

    // Find and click the delete button
    const deleteButton = podcastItem
      .locator('button')
      .filter({ has: this.page.locator('svg') })
      .or(podcastItem.getByRole('button', { name: /delete/i }));

    await deleteButton.click();

    // Confirm deletion in dialog
    await this.confirmDialog();
  }

  /**
   * Check if a podcast exists in the list
   */
  async expectPodcastVisible(title: string): Promise<void> {
    await expect(this.getPodcastByTitle(title)).toBeVisible();
  }

  /**
   * Check if a podcast does not exist in the list
   */
  async expectPodcastNotVisible(title: string): Promise<void> {
    await expect(this.getPodcastByTitle(title)).toBeHidden();
  }

  /**
   * Check if the list is empty
   */
  async expectEmpty(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /no podcasts/i }),
    ).toBeVisible();
  }

  /**
   * Get the podcast count
   */
  async getPodcastCount(): Promise<number> {
    const items = this.getPodcastItems();
    return items.count();
  }
}
