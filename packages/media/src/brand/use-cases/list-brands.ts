import { Effect } from 'effect';
import type { Brand } from '@repo/db/schema';
import { getCurrentUser, Role } from '@repo/auth/policy';
import { BrandRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface ListBrandsInput {
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface ListBrandsResult {
  brands: readonly Brand[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * List brands with optional filtering and pagination.
 *
 * If userId is not provided, uses the current user from context.
 * Admins can view all brands; regular users only see their own.
 *
 * @example
 * // List brands for current user
 * const result = yield* listBrands({});
 *
 * // List brands with pagination
 * const result = yield* listBrands({ limit: 10, offset: 0 });
 */
export const listBrands = (input: ListBrandsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const brandRepo = yield* BrandRepo;

    // Determine which user's brands to list
    // Admins can view any user's brands; regular users only their own
    const isAdmin = user.role === Role.ADMIN;
    const targetUserId = input.userId ?? user.id;
    const createdBy =
      isAdmin && input.userId ? targetUserId : isAdmin ? undefined : user.id;

    const options = {
      createdBy,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    };

    // Fetch brands and count in parallel
    const [brands, total] = yield* Effect.all([
      brandRepo.list(options),
      brandRepo.count({ createdBy }),
    ]);

    const hasMore = (options.offset ?? 0) + brands.length < total;

    return {
      brands,
      total,
      hasMore,
    };
  }).pipe(
    Effect.withSpan('useCase.listBrands', {
      attributes: {
        'filter.userId': input.userId,
        'pagination.limit': input.limit,
        'pagination.offset': input.offset,
      },
    }),
  );
