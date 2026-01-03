/**
 * Register Page Object
 *
 * Page object for the registration page.
 * Route: /register
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class RegisterPage extends BasePage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    super(page);

    this.nameInput = page.getByLabel(/full name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/^password$/i);
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.submitButton = page.getByRole('button', { name: /create account/i });
    this.signInLink = page.getByRole('link', { name: /sign in/i });
  }

  /**
   * Navigate to the register page
   */
  async goto(): Promise<void> {
    await this.page.goto('/register');
  }

  /**
   * Fill the registration form
   */
  async fill(
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
  ): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  /**
   * Submit the registration form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Register with the given details
   */
  async register(
    name: string,
    email: string,
    password: string,
    confirmPassword?: string,
  ): Promise<void> {
    await this.fill(name, email, password, confirmPassword ?? password);
    await this.submit();
    // Wait for redirect to dashboard after successful registration
    await this.page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  /**
   * Attempt registration expecting failure
   */
  async registerExpectingError(
    name: string,
    email: string,
    password: string,
    confirmPassword?: string,
  ): Promise<void> {
    await this.fill(name, email, password, confirmPassword ?? password);
    await this.submit();
    // Wait a bit for the error
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to login page
   */
  async goToSignIn(): Promise<void> {
    await this.signInLink.click();
    await this.page.waitForURL('**/login');
  }

  /**
   * Verify the page is displayed correctly
   */
  async expectVisible(): Promise<void> {
    await expect(this.page.getByText('Create account')).toBeVisible();
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Check for a validation error message
   */
  async expectError(message: string): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
