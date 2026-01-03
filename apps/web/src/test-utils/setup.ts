// test-utils/setup.ts
// Vitest setup file for component tests

import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { server } from './server';

// Start MSW server before tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

// Close server after all tests
afterAll(() => {
  server.close();
});
