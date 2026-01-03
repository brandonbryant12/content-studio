/**
 * Playwright Global Setup
 *
 * Runs once before all tests:
 * 1. Seeds test user via API
 * 2. Logs in as test user
 * 3. Saves auth state to .auth/user.json
 */

import { chromium, type FullConfig } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { TEST_USER } from './seed';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:8085';
  const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3035';

  console.log('\n🔧 Global Setup Starting...');
  console.log(`   Web URL: ${baseURL}`);
  console.log(`   API URL: ${apiURL}`);

  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Step 1: Seed test user
  console.log('\n🌱 Seeding test user...');
  await seedTestUser(apiURL);

  // Step 2: Login via browser and save auth state
  console.log('\n🔐 Logging in to save auth state...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Fill login form
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Wait for successful navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    console.log('✅ Login successful');

    // Save auth state
    await context.storageState({ path: AUTH_FILE });
    console.log(`💾 Auth state saved to ${AUTH_FILE}`);
  } catch (error) {
    console.error('❌ Login failed:', error);
    // Take a screenshot for debugging
    await page.screenshot({ path: 'e2e-results/global-setup-error.png' });
    throw error;
  } finally {
    await browser.close();
  }

  console.log('\n✅ Global Setup Complete\n');
}

async function seedTestUser(apiURL: string) {
  // Try to sign in first
  const signInResponse = await fetch(`${apiURL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
  });

  const signInResult = (await signInResponse.json()) as { user?: object };

  if (signInResult.user) {
    console.log('   Test user already exists');
    return;
  }

  // Create user
  const signUpResponse = await fetch(`${apiURL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: TEST_USER.name,
    }),
  });

  const signUpResult = (await signUpResponse.json()) as {
    user?: object;
    error?: { message: string };
  };

  if (signUpResult.user) {
    console.log('   Test user created');
  } else if (signUpResult.error?.message?.includes('already exists')) {
    console.log('   Test user already exists');
  } else {
    throw new Error(`Failed to create test user: ${JSON.stringify(signUpResult)}`);
  }
}

export default globalSetup;
