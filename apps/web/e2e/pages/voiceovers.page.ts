/**
 * Voiceovers Page Object
 *
 * Page object for the voiceovers list and detail pages.
 * Route: /voiceovers, /voiceovers/:id
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class VoiceoversPage extends BasePage {
  readonly createButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);

    // Use "Create New" button in the header
    this.createButton = page.getByRole('button', { name: 'Create New' });
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  /**
   * Navigate to the voiceovers list page
   */
  async goto(): Promise<void> {
    await this.page.goto('/voiceovers');
    await this.waitForLoading();
  }

  /**
   * Verify the voiceovers page is displayed
   */
  async expectVisible(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: 'Voiceovers', level: 1 }),
    ).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  /**
   * Create a new voiceover
   */
  async createVoiceover(): Promise<void> {
    await this.createButton.click();
    // Wait for navigation to new voiceover page
    await this.page.waitForURL('**/voiceovers/**');
  }

  /**
   * Search for voiceovers
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
   * Get all voiceover items
   */
  getVoiceoverItems(): Locator {
    return this.page.locator('a[href*="/voiceovers/"]');
  }

  /**
   * Get a specific voiceover by title
   */
  getVoiceoverByTitle(title: string): Locator {
    return this.page.locator('a, div').filter({ hasText: title }).first();
  }

  /**
   * Click on a voiceover to navigate to its detail page
   */
  async openVoiceover(title: string): Promise<void> {
    const voiceoverItem = this.getVoiceoverByTitle(title);
    await voiceoverItem.click();
    await this.page.waitForURL('**/voiceovers/**');
  }

  /**
   * Delete a voiceover by title from the list page
   */
  async deleteVoiceoverFromList(title: string): Promise<void> {
    const voiceoverItem = this.getVoiceoverByTitle(title);

    // Hover to reveal delete button
    await voiceoverItem.hover();

    // Find and click the delete button (trash icon)
    const deleteButton = voiceoverItem
      .locator('button')
      .filter({ has: this.page.locator('svg') })
      .or(voiceoverItem.getByRole('button', { name: /delete/i }));

    await deleteButton.click();
  }

  /**
   * Check if a voiceover exists in the list
   */
  async expectVoiceoverVisible(title: string): Promise<void> {
    await expect(this.getVoiceoverByTitle(title)).toBeVisible();
  }

  /**
   * Check if a voiceover does not exist in the list
   */
  async expectVoiceoverNotVisible(title: string): Promise<void> {
    await expect(this.getVoiceoverByTitle(title)).toBeHidden();
  }

  /**
   * Check if the list is empty
   */
  async expectEmpty(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /no voiceovers/i }),
    ).toBeVisible();
  }

  /**
   * Get the voiceover count
   */
  async getVoiceoverCount(): Promise<number> {
    const items = this.getVoiceoverItems();
    return items.count();
  }

  // ============================================================================
  // Workbench (Voiceover Detail) Methods
  // ============================================================================

  /**
   * Get the title element in the workbench header
   */
  getWorkbenchTitle(): Locator {
    return this.page.locator('.workbench-title');
  }

  /**
   * Get the text editor textarea
   */
  getTextEditor(): Locator {
    return this.page.getByPlaceholder('Enter your voiceover text here...');
  }

  /**
   * Enter text in the text editor
   */
  async enterText(text: string): Promise<void> {
    const editor = this.getTextEditor();
    await editor.fill(text);
  }

  /**
   * Get the current text from the editor
   */
  async getText(): Promise<string> {
    const editor = this.getTextEditor();
    return editor.inputValue();
  }

  /**
   * Get the status badge in the workbench header
   */
  getStatusBadge(): Locator {
    return this.page.locator('.workbench-meta > span').first();
  }

  /**
   * Expect status badge to show "Drafting"
   */
  async expectStatusDrafting(): Promise<void> {
    await expect(
      this.page.locator('.workbench-meta').getByText(/drafting/i),
    ).toBeVisible({ timeout: 5000 });
  }

  /**
   * Expect status badge to show "Generating Audio"
   */
  async expectStatusGeneratingAudio(): Promise<void> {
    await expect(
      this.page.locator('.workbench-meta').getByText(/generating audio/i),
    ).toBeVisible({ timeout: 5000 });
  }

  /**
   * Expect status badge to show "Ready"
   */
  async expectStatusReady(): Promise<void> {
    await expect(
      this.page.locator('.workbench-meta').getByText(/^ready$/i),
    ).toBeVisible({ timeout: 30000 });
  }

  /**
   * Get the global action bar
   */
  getActionBar(): Locator {
    return this.page.locator('.global-action-bar');
  }

  /**
   * Get the action bar status text
   */
  getActionBarStatus(): Locator {
    return this.page.locator('.global-action-bar-status-text');
  }

  /**
   * Expect action bar to show "Generating audio..."
   */
  async expectActionBarGeneratingAudio(): Promise<void> {
    await expect(
      this.page.locator('.global-action-bar').getByText(/generating audio/i),
    ).toBeVisible({ timeout: 5000 });
  }

  /**
   * Click the Generate Audio button in the action bar
   */
  async clickGenerateAudio(): Promise<void> {
    const button = this.page.getByRole('button', { name: /generate audio/i });
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Click the Save & Generate button in the action bar
   */
  async clickSaveAndGenerate(): Promise<void> {
    const button = this.page.getByRole('button', { name: /save & generate/i });
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Click the Save button in the action bar
   */
  async clickSave(): Promise<void> {
    const button = this.page.getByRole('button', { name: /^save$/i });
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Get the audio player element
   */
  getAudioPlayer(): Locator {
    return this.page.locator('audio');
  }

  /**
   * Expect audio player to be visible
   */
  async expectAudioPlayerVisible(): Promise<void> {
    await expect(this.getAudioPlayer()).toBeVisible({ timeout: 30000 });
  }

  /**
   * Get the delete button in the workbench header
   */
  getDeleteButton(): Locator {
    return this.page.getByRole('button', { name: /delete voiceover/i });
  }

  /**
   * Click delete in the workbench and confirm
   */
  async deleteVoiceover(): Promise<void> {
    await this.getDeleteButton().click();
    await this.confirmDialog();
    // Wait for navigation back to list
    await this.page.waitForURL('**/voiceovers');
  }

  // ============================================================================
  // Voice Selector Methods
  // ============================================================================

  /**
   * Get the voice selector
   */
  getVoiceSelector(): Locator {
    return this.page.locator('[data-testid="voice-selector"]').or(
      this.page.getByRole('combobox'),
    );
  }

  /**
   * Select a voice by name
   */
  async selectVoice(voiceName: string): Promise<void> {
    const selector = this.getVoiceSelector();
    await selector.click();
    await this.page.getByRole('option', { name: voiceName }).click();
  }

  // ============================================================================
  // Collaborator Methods
  // ============================================================================

  /**
   * Get the collaborator avatars component
   */
  getCollaboratorAvatars(): Locator {
    return this.page.locator('.collab-avatars').or(
      this.page.locator('[data-testid="collaborator-avatars"]'),
    );
  }

  /**
   * Click on collaborator avatars to open manage dialog
   */
  async openCollaboratorDialog(): Promise<void> {
    // Click the manage button (+) in the collaborator avatars
    const manageButton = this.page.getByRole('button', { name: /manage/i }).or(
      this.page.locator('.collab-avatars-manage'),
    );
    await manageButton.click();
    // Wait for dialog to open
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  /**
   * Get the Add Collaborator dialog
   */
  getAddCollaboratorDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /add collaborator/i });
  }

  /**
   * Add a collaborator by email
   */
  async addCollaborator(email: string): Promise<void> {
    // Click the add button to open the add collaborator dialog
    const addButton = this.page.getByRole('button', { name: /add/i }).or(
      this.page.locator('.collab-add-btn'),
    );
    await addButton.click();

    // Wait for dialog
    await expect(this.getAddCollaboratorDialog()).toBeVisible();

    // Fill in email
    const emailInput = this.page.getByLabel(/email/i);
    await emailInput.fill(email);

    // Submit
    await this.page.getByRole('button', { name: /send invite/i }).click();

    // Wait for dialog to close
    await expect(this.getAddCollaboratorDialog()).toBeHidden();
  }

  /**
   * Get the collaborator list
   */
  getCollaboratorList(): Locator {
    return this.page.locator('.collab-list');
  }

  /**
   * Expect a collaborator to be visible in the list
   */
  async expectCollaboratorVisible(emailOrName: string): Promise<void> {
    await expect(
      this.getCollaboratorList().getByText(emailOrName),
    ).toBeVisible();
  }

  /**
   * Remove a collaborator by email/name
   */
  async removeCollaborator(emailOrName: string): Promise<void> {
    const row = this.page.locator('.collab-list-row').filter({
      hasText: emailOrName,
    });
    const removeButton = row.getByRole('button', { name: /remove/i });
    await removeButton.click();
  }

  /**
   * Get the Approve button
   */
  getApproveButton(): Locator {
    return this.page.locator('.approve-btn');
  }

  /**
   * Click the Approve button
   */
  async clickApprove(): Promise<void> {
    const button = this.getApproveButton();
    await button.click();
  }

  /**
   * Expect approval state to be "Approved"
   */
  async expectApproved(): Promise<void> {
    await expect(
      this.getApproveButton().getByText(/approved/i),
    ).toBeVisible({ timeout: 5000 });
  }

  /**
   * Expect approval state to be "Approve" (not yet approved)
   */
  async expectNotApproved(): Promise<void> {
    await expect(
      this.getApproveButton().getByText(/^approve$/i),
    ).toBeVisible({ timeout: 5000 });
  }
}
