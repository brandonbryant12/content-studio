import { Effect } from 'effect';
import { requireOwnership } from '@repo/auth/policy';
import { BrandRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GetBrandInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get a brand by ID.
 *
 * Verifies that the current user owns the brand (or is admin).
 *
 * @example
 * const brand = yield* getBrand({ id: 'brand_abc123' });
 */
export const getBrand = (input: GetBrandInput) =>
  Effect.gen(function* () {
    const brandRepo = yield* BrandRepo;

    // Fetch brand from database
    const brand = yield* brandRepo.findById(input.id);

    // Check ownership (allows owner or admin)
    yield* requireOwnership(brand.createdBy);

    return brand;
  }).pipe(
    Effect.withSpan('useCase.getBrand', {
      attributes: { 'brand.id': input.id },
    }),
  );
