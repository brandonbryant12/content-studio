import { getCurrentUser, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { DocumentListItem } from '@repo/db/schema';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { DocumentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface ListDocumentsInput {
  userId?: string;
  source?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListDocumentsResult {
  documents: readonly DocumentListItem[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

export const listDocuments = (input: ListDocumentsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;

    const createdBy = user.role === Role.ADMIN ? input.userId : user.id;
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const spanAttributes: Record<string, string | number> = {
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
      resourceId: createdBy ?? user.id,
      attributes: spanAttributes,
    });

    const [documents, total] = yield* Effect.all(
      [documentRepo.list(listOptions), documentRepo.count({ createdBy })],
      { concurrency: 'unbounded' },
    );

    return {
      documents,
      total,
      hasMore: offset + documents.length < total,
    };
  }).pipe(withUseCaseSpan('useCase.listDocuments'));
