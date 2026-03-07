import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { DbUser } from '@repo/db/schema';
import { defineRoleUseCase } from '../../shared';
import { AdminRepo } from '../repos/admin-repo';

export interface SearchUsersInput {
  readonly query?: string;
  readonly limit?: number;
}

export interface SearchUsersResult {
  readonly users: readonly DbUser[];
}

const DEFAULT_LIMIT = 20;

export const searchUsers = defineRoleUseCase<SearchUsersInput>()({
  name: 'useCase.searchUsers',
  role: Role.ADMIN,
  span: ({ input }) => ({
    collection: 'adminUsers',
    attributes: {
      'pagination.limit': input.limit ?? DEFAULT_LIMIT,
      ...(input.query?.trim() ? { 'search.query': input.query.trim() } : {}),
    },
  }),
  run: ({ input }) =>
    Effect.gen(function* () {
      const adminRepo = yield* AdminRepo;
      const users = yield* adminRepo.searchUsers({
        query: input.query,
        limit: input.limit ?? DEFAULT_LIMIT,
      });

      return { users };
    }),
});
