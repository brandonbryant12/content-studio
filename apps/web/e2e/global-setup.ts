/**
 * Playwright Global Setup
 *
 * Runs once before all tests:
 * 1. Seeds test user via API
 */

import { type FullConfig } from '@playwright/test';

import { TEST_USER } from './seed';
const authHeaders = (webUrl: string) => ({
  'Content-Type': 'application/json',
  Origin: new URL(webUrl).origin,
});

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:8085';
  const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3035';

  console.log('\n🔧 Global Setup Starting...');
  console.log(`   Web URL: ${baseURL}`);
  console.log(`   API URL: ${apiURL}`);

  // Step 1: Seed test user
  console.log('\n🌱 Seeding test user...');
  await seedTestUser(apiURL, baseURL);

  console.log('\n✅ Global Setup Complete\n');
}

async function seedTestUser(apiURL: string, webUrl: string) {
  // Try to sign in first
  const signInResponse = await fetch(`${apiURL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: authHeaders(webUrl),
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
    headers: authHeaders(webUrl),
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
    throw new Error(
      `Failed to create test user: ${JSON.stringify(signUpResult)}`,
    );
  }
}

export default globalSetup;
