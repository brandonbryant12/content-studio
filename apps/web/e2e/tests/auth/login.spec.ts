/**
 * Login Page E2E Tests
 *
 * Tests for the login flow including:
 * - Successful login
 * - Validation errors
 * - Invalid credentials
 */

import { test, expect } from '../../fixtures';
import { TEST_USER } from '../../seed';

test.describe('Login Page', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('displays login form correctly', async ({ loginPage }) => {
    await loginPage.expectVisible();
  });

  test('shows validation error for invalid email', async ({ loginPage }) => {
    await loginPage.fill('invalid-email', 'password123');
    await loginPage.emailInput.blur();
    await loginPage.expectEmailError('Please enter a valid email address');
  });

  test('shows validation error for short password', async ({ loginPage }) => {
    await loginPage.fill('test@example.com', 'short');
    await loginPage.passwordInput.blur();
    await loginPage.expectPasswordError('Password must be at least 8 characters');
  });

  test('shows error toast for invalid credentials', async ({ loginPage }) => {
    await loginPage.loginExpectingError('wrong@example.com', 'wrongpassword123');
    await loginPage.expectToast('Invalid email or password');
  });

  test('successfully logs in with valid credentials', async ({ loginPage }) => {
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    // Should redirect to dashboard
    await expect(loginPage.page).toHaveURL(/\/dashboard/);
  });

  test('can navigate to registration page', async ({ loginPage }) => {
    await loginPage.goToSignUp();
    await expect(loginPage.page).toHaveURL(/\/register/);
  });
});
