import { requireRole, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { DbUser } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
import { AdminRepo } from '../repos/admin-repo';

export interface SearchUsersInput {
  readonly query?: string;
  readonly limit?: number;
}

export interface SearchUsersResult {
  readonly users: readonly DbUser[];
}

const DEFAULT_LIMIT = 20;

export const searchUsers = defineAuthedUseCase<SearchUsersInput>()({
  name: 'useCase.searchUsers',
  span: ({ input }) => ({
    collection: 'adminUsers',
    attributes: {
      'pagination.limit': input.limit ?? DEFAULT_LIMIT,
      ...(input.query?.trim() ? { 'search.query': input.query.trim() } : {}),
    },
  }),
  run: ({ input }) =>
    Effect.gen(function* () {
      yield* requireRole(Role.ADMIN);
      const adminRepo = yield* AdminRepo;
      const users = yield* adminRepo.searchUsers({
        query: input.query,
        limit: input.limit ?? DEFAULT_LIMIT,
      });

      return { users };
    }),
});
