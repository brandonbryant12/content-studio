import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { SourceListItem } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
import { SourceRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface ListSourcesInput {
  userId?: string;
  source?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListSourcesResult {
  sources: readonly SourceListItem[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

const DEFAULT_LIST_SOURCES_LIMIT = 50;
const DEFAULT_LIST_SOURCES_OFFSET = 0;

export const listSources = defineAuthedUseCase<ListSourcesInput>()({
  name: 'useCase.listSources',
  span: ({ input, user }) => {
    const createdBy = user.role === Role.ADMIN ? input.userId : user.id;
    const limit = input.limit ?? DEFAULT_LIST_SOURCES_LIMIT;
    const offset = input.offset ?? DEFAULT_LIST_SOURCES_OFFSET;

    return {
      collection: 'sources',
      attributes: {
        ...(createdBy ? { 'owner.id': createdBy } : {}),
        'pagination.limit': limit,
        'pagination.offset': offset,
        ...(input.userId ? { 'filter.userId': input.userId } : {}),
      },
    };
  },
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const sourceRepo = yield* SourceRepo;
      const createdBy = user.role === Role.ADMIN ? input.userId : user.id;
      const limit = input.limit ?? DEFAULT_LIST_SOURCES_LIMIT;
      const offset = input.offset ?? DEFAULT_LIST_SOURCES_OFFSET;

      const [sources, total] = yield* Effect.all(
        [
          sourceRepo.list({
            createdBy,
            source: input.source,
            status: input.status,
            limit,
            offset,
          }),
          sourceRepo.count({ createdBy }),
        ],
        { concurrency: 'unbounded' },
      );

      return {
        sources,
        total,
        hasMore: offset + sources.length < total,
      };
    }),
});
