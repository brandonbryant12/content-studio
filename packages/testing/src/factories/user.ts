import { randomUUID } from 'crypto';

/**
 * Minimal user type for testing.
 */
export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

/**
 * Options for creating a test user.
 */
export interface CreateTestUserOptions {
  id?: string;
  email?: string;
  name?: string;
  role?: 'user' | 'admin';
}

let userCounter = 0;

/**
 * Create a test user with default values.
 */
export const createTestUser = (
  options: CreateTestUserOptions = {},
): TestUser => {
  userCounter++;
  return {
    id: options.id ?? randomUUID(),
    email: options.email ?? `testuser${userCounter}@example.com`,
    name: options.name ?? `Test User ${userCounter}`,
    role: options.role ?? 'user',
  };
};

/**
 * Create a test admin user.
 */
export const createTestAdmin = (
  options: Omit<CreateTestUserOptions, 'role'> = {},
): TestUser => {
  return createTestUser({ ...options, role: 'admin' });
};

/**
 * Reset the user counter (call in beforeEach for consistent test data).
 */
export const resetUserCounter = () => {
  userCounter = 0;
};
