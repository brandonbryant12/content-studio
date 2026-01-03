/**
 * Registration Page E2E Tests
 *
 * Tests for the registration flow including:
 * - Successful registration
 * - Validation errors
 * - Password mismatch
 * - Existing email
 */

import { test, expect } from '../../fixtures';
import { TEST_USER } from '../../seed';

test.describe('Register Page', () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test('displays registration form correctly', async ({ registerPage }) => {
    await registerPage.expectVisible();
  });

  test('shows validation error for short name', async ({ registerPage }) => {
    await registerPage.nameInput.fill('A');
    await registerPage.nameInput.blur();
    await registerPage.expectError('Name must be at least 2 characters');
  });

  test('shows validation error for invalid email', async ({ registerPage }) => {
    await registerPage.emailInput.fill('invalid-email');
    await registerPage.emailInput.blur();
    await registerPage.expectError('Please enter a valid email address');
  });

  test('shows validation error for short password', async ({ registerPage }) => {
    await registerPage.passwordInput.fill('short');
    await registerPage.passwordInput.blur();
    await registerPage.expectError('Password must be at least 8 characters');
  });

  test('shows validation error for password mismatch', async ({ registerPage }) => {
    await registerPage.fill('Test User', 'test@example.com', 'password123', 'different123');
    await registerPage.confirmPasswordInput.blur();
    await registerPage.expectError('The two passwords do not match');
  });

  test('shows error for existing email', async ({ registerPage }) => {
    // Try to register with the test user email that already exists
    await registerPage.registerExpectingError(
      'Another User',
      TEST_USER.email,
      'newpassword123',
    );
    await registerPage.expectToast('already exists');
  });

  test('successfully registers new user', async ({ registerPage, page }) => {
    // Generate unique email for this test
    const uniqueEmail = `e2e-new-${Date.now()}@example.com`;

    await registerPage.register('New Test User', uniqueEmail, 'newpassword123');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('can navigate to login page', async ({ registerPage }) => {
    await registerPage.goToSignIn();
    await expect(registerPage.page).toHaveURL(/\/login/);
  });
});
