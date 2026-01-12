/**
 * Playwright Test Fixtures
 *
 * Custom fixtures for E2E tests including:
 * - Page objects for each page
 * - Authenticated test helper
 * - API helper for direct data manipulation
 */

import { test as base, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { DashboardPage } from '../pages/dashboard.page';
import { DocumentsPage } from '../pages/documents.page';
import { PodcastsPage } from '../pages/podcasts.page';
import { VoiceoversPage } from '../pages/voiceovers.page';
import { InfographicsPage } from '../pages/infographics.page';
import { ApiHelper } from '../utils/api';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auth file path for authenticated tests
const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json');

// Fixture types
interface PageFixtures {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  documentsPage: DocumentsPage;
  podcastsPage: PodcastsPage;
  voiceoversPage: VoiceoversPage;
  infographicsPage: InfographicsPage;
  api: ApiHelper;
}

/**
 * Base test with page object fixtures
 */
export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  documentsPage: async ({ page }, use) => {
    await use(new DocumentsPage(page));
  },

  podcastsPage: async ({ page }, use) => {
    await use(new PodcastsPage(page));
  },

  voiceoversPage: async ({ page }, use) => {
    await use(new VoiceoversPage(page));
  },

  infographicsPage: async ({ page }, use) => {
    await use(new InfographicsPage(page));
  },

  api: async ({ request }, use) => {
    const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3035';
    await use(new ApiHelper(request, apiURL));
  },
});

/**
 * Authenticated test - uses stored auth state
 * Use this for tests that require a logged-in user
 */
export const authenticatedTest = test.extend<PageFixtures>({
  // Override storageState to use saved auth
  storageState: AUTH_FILE,
});

// Re-export expect for convenience
export { expect } from '@playwright/test';
