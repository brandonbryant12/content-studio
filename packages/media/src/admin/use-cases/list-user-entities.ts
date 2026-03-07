import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import type {
  AdminUserEntityRecord,
  AdminUserEntityType,
} from '../repos/admin-repo';
import { defineRoleUseCase } from '../../shared';
import { AdminRepo } from '../repos/admin-repo';

export interface ListUserEntitiesInput {
  readonly userId: string;
  readonly query?: string;
  readonly entityType?: AdminUserEntityType;
  readonly limit?: number;
  readonly offset?: number;
}

export interface ListUserEntitiesResult {
  readonly entities: readonly AdminUserEntityRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

const DEFAULT_LIMIT = 12;

export const listUserEntities = defineRoleUseCase<ListUserEntitiesInput>()({
  name: 'useCase.listUserEntities',
  role: Role.ADMIN,
  span: ({ input }) => ({
    resourceId: input.userId,
    attributes: {
      'admin.targetUserId': input.userId,
      'pagination.limit': input.limit ?? DEFAULT_LIMIT,
      'pagination.offset': input.offset ?? 0,
      ...(input.query?.trim() ? { 'search.query': input.query.trim() } : {}),
      ...(input.entityType ? { 'filter.entityType': input.entityType } : {}),
    },
  }),
  run: ({ input }) =>
    Effect.gen(function* () {
      const adminRepo = yield* AdminRepo;
      const limit = input.limit ?? DEFAULT_LIMIT;
      const offset = input.offset ?? 0;

      yield* adminRepo.findUserById(input.userId);

      const [entities, total] = yield* Effect.all(
        [
          adminRepo.listUserEntities({
            userId: input.userId,
            query: input.query,
            entityType: input.entityType,
            limit,
            offset,
          }),
          adminRepo.countUserEntities({
            userId: input.userId,
            query: input.query,
            entityType: input.entityType,
          }),
        ],
        { concurrency: 'unbounded' },
      );

      return {
        entities,
        total,
        hasMore: offset + entities.length < total,
      };
    }),
});
