// test-utils/server.ts
// MSW server setup for component tests

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
