/**
 * Playwright Test Fixtures
 *
 * Custom fixtures for E2E tests including:
 * - Page objects for each page
 * - Authenticated test helper
 * - API helper for direct data manipulation
 */

import { test as base, type Page, type Playwright } from '@playwright/test';

import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { DashboardPage } from '../pages/dashboard.page';
import { SourcesPage } from '../pages/sources.page';
import { PodcastsPage } from '../pages/podcasts.page';
import { VoiceoversPage } from '../pages/voiceovers.page';
import { TEST_USER } from '../seed';
import { ApiHelper } from '../utils/api';

// Fixture types
interface PageFixtures {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  sourcesPage: SourcesPage;
  podcastsPage: PodcastsPage;
  voiceoversPage: VoiceoversPage;
  api: ApiHelper;
}

const authHeaders = (webURL: string): HeadersInit => ({
  'Content-Type': 'application/json',
  Origin: new URL(webURL).origin,
});

const signInTestUser = async (
  apiURL: string,
  webURL: string,
): Promise<string> => {
  const response = await fetch(`${apiURL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: authHeaders(webURL),
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
  });
  const body = (await response.json()) as {
    user?: { id: string };
    error?: { message?: string };
  };

  if (!response.ok || !body.user) {
    throw new Error(
      `Failed to sign in E2E test user: ${response.status} ${JSON.stringify(body)}`,
    );
  }

  const token = response.headers.get('set-auth-token');
  if (!token) {
    throw new Error('E2E sign-in did not return set-auth-token header');
  }

  return token;
};

const createApiHelper = async ({
  playwright,
  apiURL,
  webURL,
}: {
  playwright: Playwright;
  apiURL: string;
  webURL: string;
}) => {
  const token = await signInTestUser(apiURL, webURL);
  const request = await playwright.request.newContext({
    baseURL: `${apiURL}/api`,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: new URL(webURL).origin,
    },
  });

  return {
    helper: new ApiHelper(request, apiURL),
    request,
  };
};

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

  sourcesPage: async ({ page }, use) => {
    await use(new SourcesPage(page));
  },

  podcastsPage: async ({ page }, use) => {
    await use(new PodcastsPage(page));
  },

  voiceoversPage: async ({ page }, use) => {
    await use(new VoiceoversPage(page));
  },

  api: async ({ playwright, baseURL }, use) => {
    const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3035';
    const webURL =
      process.env.E2E_BASE_URL ?? baseURL ?? 'http://localhost:8085';
    const { helper, request } = await createApiHelper({
      playwright,
      apiURL,
      webURL,
    });

    try {
      await use(helper);
    } finally {
      await request.dispose();
    }
  },
});

/**
 * Authenticated test - uses stored auth state
 * Use this for tests that require a logged-in user
 */
export const authenticatedTest = test.extend<PageFixtures>({
  page: async ({ page, baseURL }, use) => {
    const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3035';
    const webURL =
      process.env.E2E_BASE_URL ?? baseURL ?? 'http://localhost:8085';
    const token = await signInTestUser(apiURL, webURL);

    await page.route(`${new URL(apiURL).origin}/**`, async (route, request) => {
      await route.continue({
        headers: {
          ...request.headers(),
          authorization: `Bearer ${token}`,
        },
      });
    });

    await use(page);
  },

  api: async ({ playwright, baseURL }, use) => {
    const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3035';
    const webURL =
      process.env.E2E_BASE_URL ?? baseURL ?? 'http://localhost:8085';
    const { helper, request } = await createApiHelper({
      playwright,
      apiURL,
      webURL,
    });

    try {
      await use(helper);
    } finally {
      await request.dispose();
    }
  },
});

// Re-export expect for convenience
export { expect } from '@playwright/test';
