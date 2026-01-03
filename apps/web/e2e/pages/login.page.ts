/**
 * Login Page Object
 *
 * Page object for the login page.
 * Route: /login
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly signUpLink: Locator;
  readonly togglePasswordButton: Locator;

  constructor(page: Page) {
    super(page);

    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.signUpLink = page.getByRole('link', { name: /sign up/i });
    this.togglePasswordButton = page.getByRole('button').filter({
      has: page.locator('svg'),
    });
  }

  /**
   * Navigate to the login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  /**
   * Fill the login form
   */
  async fill(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Login with the given credentials
   * Combines fill + submit + wait for navigation
   */
  async login(email: string, password: string): Promise<void> {
    await this.fill(email, password);
    await this.submit();
    // Wait for redirect to dashboard after successful login
    await this.page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  /**
   * Attempt login expecting failure
   */
  async loginExpectingError(email: string, password: string): Promise<void> {
    await this.fill(email, password);
    await this.submit();
    // Wait a bit for the error toast
    await this.page.waitForTimeout(500);
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    // Click the button inside the password field container
    const passwordContainer = this.page.locator('div').filter({
      has: this.passwordInput,
    });
    await passwordContainer.getByRole('button').click();
  }

  /**
   * Navigate to registration page
   */
  async goToSignUp(): Promise<void> {
    await this.signUpLink.click();
    await this.page.waitForURL('**/register');
  }

  /**
   * Verify the page is displayed correctly
   */
  async expectVisible(): Promise<void> {
    await expect(this.page.getByText('Sign in')).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Check if the email field has a validation error
   */
  async expectEmailError(message: string): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  /**
   * Check if the password field has a validation error
   */
  async expectPasswordError(message: string): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
