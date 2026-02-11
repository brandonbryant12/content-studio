import { Effect } from 'effect';
import type { Document } from '@repo/db/schema';
import { getCurrentUser, Role } from '@repo/auth/policy';
import { DocumentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface ListDocumentsInput {
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface ListDocumentsResult {
  documents: readonly Document[];
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

    const isAdmin = user.role === Role.ADMIN;
    const createdBy =
      isAdmin && input.userId ? input.userId : isAdmin ? undefined : user.id;

    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;

    const [documents, total] = yield* Effect.all(
      [
        documentRepo.list({ createdBy, limit, offset }),
        documentRepo.count({ createdBy }),
      ],
      { concurrency: 'unbounded' },
    );

    return {
      documents,
      total,
      hasMore: offset + documents.length < total,
    };
  }).pipe(
    Effect.withSpan('useCase.listDocuments', {
      attributes: {
        'filter.userId': input.userId,
        'pagination.limit': input.limit,
        'pagination.offset': input.offset,
      },
    }),
  );
