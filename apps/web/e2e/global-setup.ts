/**
 * Playwright Global Setup
 *
 * Runs once before all tests to seed test data.
 * Servers are already running at this point (started by webServer config).
 */

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3035';

interface TestUser {
  name: string;
  email: string;
  password: string;
}

const TEST_USERS: TestUser[] = [
  {
    name: 'Test User',
    email: 'test@example.com',
    password: 'testpassword123',
  },
];

async function signUp(
  user: TestUser,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        password: user.password,
      }),
    });

    if (response.ok) {
      return { success: true, message: `Created user: ${user.email}` };
    }

    const body = await response.json().catch(() => ({}));

    // User already exists is fine for seeding
    if (
      response.status === 422 ||
      body.message?.includes('already exists') ||
      body.code === 'USER_ALREADY_EXISTS'
    ) {
      return { success: true, message: `User already exists: ${user.email}` };
    }

    return {
      success: false,
      message: `Failed to create user ${user.email}: ${response.status} ${JSON.stringify(body)}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error creating user ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default async function globalSetup() {
  console.log('\n[Global Setup] Seeding test users...');

  for (const user of TEST_USERS) {
    const result = await signUp(user);
    console.log(
      `[Global Setup] ${result.success ? '✓' : '✗'} ${result.message}`,
    );
    if (!result.success) {
      throw new Error(`Failed to seed test user: ${result.message}`);
    }
  }

  console.log('[Global Setup] Test users seeded successfully\n');
}
