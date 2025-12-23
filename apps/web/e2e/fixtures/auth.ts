import { type Page } from '@playwright/test';

/**
 * Test user credentials.
 * These should match users created in the test database.
 */
export interface TestCredentials {
  email: string;
  password: string;
}

/**
 * Default test user credentials.
 * Update these to match your test database setup.
 */
export const DEFAULT_TEST_USER: TestCredentials = {
  email: 'test@example.com',
  password: 'testpassword123',
};

/**
 * Log in to the application.
 *
 * @param page - Playwright page
 * @param credentials - User credentials (defaults to test user)
 *
 * @example
 * ```ts
 * test('user can access dashboard', async ({ page }) => {
 *   await login(page);
 *   await expect(page.getByText('Dashboard')).toBeVisible();
 * });
 * ```
 */
export const login = async (
  page: Page,
  credentials: TestCredentials = DEFAULT_TEST_USER,
): Promise<void> => {
  await page.goto('/login');

  // Fill in login form
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);

  // Click login button
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for navigation to complete (either dashboard or home)
  await page.waitForURL(/\/(dashboard|podcasts|projects)?$/);
};

/**
 * Log out of the application.
 */
export const logout = async (page: Page): Promise<void> => {
  // Click user menu and logout
  await page.getByRole('button', { name: /user|account|profile/i }).click();
  await page.getByRole('menuitem', { name: /log out|sign out/i }).click();

  // Wait for redirect to login
  await page.waitForURL(/\/login/);
};

/**
 * Check if user is logged in.
 */
export const isLoggedIn = async (page: Page): Promise<boolean> => {
  try {
    // Look for user menu or dashboard elements
    await page.getByRole('button', { name: /user|account|profile/i }).waitFor({
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Ensure user is logged in, logging in if necessary.
 */
export const ensureLoggedIn = async (
  page: Page,
  credentials: TestCredentials = DEFAULT_TEST_USER,
): Promise<void> => {
  if (!(await isLoggedIn(page))) {
    await login(page, credentials);
  }
};
