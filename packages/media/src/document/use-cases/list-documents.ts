import { Effect } from 'effect';
import type { Db } from '@repo/db/effect';
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

/**
 * List documents with optional filtering and pagination.
 *
 * If userId is not provided, uses the current user from context.
 * Admins can view all documents; regular users only see their own.
 *
 * @example
 * // List documents for current user
 * const result = yield* listDocuments({});
 *
 * // List documents with pagination
 * const result = yield* listDocuments({ limit: 10, offset: 0 });
 */
export const listDocuments = (input: ListDocumentsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;

    // Determine which user's documents to list
    // Admins can view any user's documents; regular users only their own
    const isAdmin = user.role === Role.ADMIN;
    const targetUserId = input.userId ?? user.id;
    const createdBy =
      isAdmin && input.userId ? targetUserId : isAdmin ? undefined : user.id;

    const options = {
      createdBy,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    };

    // Fetch documents and count in parallel
    const [documents, total] = yield* Effect.all([
      documentRepo.list(options),
      documentRepo.count({ createdBy }),
    ]);

    const hasMore = (options.offset ?? 0) + documents.length < total;

    return {
      documents,
      total,
      hasMore,
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
