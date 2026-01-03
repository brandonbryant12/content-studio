/**
 * E2E Test Seed Script
 *
 * Creates a test user for E2E tests via the better-auth API.
 * Run with: pnpm --filter web e2e:seed
 */

export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'TestPassword123!',
  name: 'E2E Test User',
};

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3035';
const AUTH_PATH = '/api/auth';

interface AuthResponse {
  user?: { id: string; email: string; name: string };
  error?: { message: string };
}

async function signUp(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${AUTH_PATH}/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: TEST_USER.name,
    }),
  });

  return response.json() as Promise<AuthResponse>;
}

async function signIn(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${AUTH_PATH}/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
  });

  return response.json() as Promise<AuthResponse>;
}

async function seed() {
  console.log('🌱 Seeding E2E test user...');
  console.log(`   API URL: ${API_BASE_URL}`);

  // Try to sign in first (user might already exist)
  const signInResult = await signIn();

  if (signInResult.user) {
    console.log('✅ Test user already exists, signed in successfully');
    console.log(`   Email: ${TEST_USER.email}`);
    return;
  }

  // User doesn't exist, create them
  console.log('📝 Creating test user...');
  const signUpResult = await signUp();

  if (signUpResult.user) {
    console.log('✅ Test user created successfully');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   User ID: ${signUpResult.user.id}`);
  } else if (signUpResult.error) {
    // Check if it's a duplicate email error
    if (signUpResult.error.message?.includes('already exists')) {
      console.log('✅ Test user already exists');
    } else {
      console.error('❌ Failed to create test user:', signUpResult.error);
      process.exit(1);
    }
  }
}

// Run if executed directly (not imported as a module)
// Check if this is the main module being run
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seed().catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
}

// Export seed function for use in global-setup
export { seed };
