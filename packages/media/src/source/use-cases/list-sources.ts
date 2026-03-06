import { getCurrentUser, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { SourceListItem } from '@repo/db/schema';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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

export const listSources = (input: ListSourcesInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const sourceRepo = yield* SourceRepo;

    const createdBy = user.role === Role.ADMIN ? input.userId : user.id;
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const spanAttributes: Record<string, string | number> = {
      ...(createdBy ? { 'owner.id': createdBy } : {}),
      'pagination.limit': limit,
      'pagination.offset': offset,
      ...(input.userId ? { 'filter.userId': input.userId } : {}),
    };
    const listOptions = {
      createdBy,
      source: input.source,
      status: input.status,
      limit,
      offset,
    };

    yield* annotateUseCaseSpan({
      userId: user.id,
      collection: 'sources',
      attributes: spanAttributes,
    });

    const [sources, total] = yield* Effect.all(
      [sourceRepo.list(listOptions), sourceRepo.count({ createdBy })],
      { concurrency: 'unbounded' },
    );

    return {
      sources,
      total,
      hasMore: offset + sources.length < total,
    };
  }).pipe(withUseCaseSpan('useCase.listSources'));
