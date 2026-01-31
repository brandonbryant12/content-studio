import { Effect } from 'effect';
import type { UpdateBrand } from '@repo/db/schema';
import { requireOwnership } from '@repo/auth/policy';
import { BrandRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface UpdateBrandInput {
  id: string;
  data: UpdateBrand;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Update a brand's metadata.
 *
 * This use case:
 * 1. Fetches the existing brand
 * 2. Verifies ownership (owner or admin)
 * 3. Updates brand in database
 *
 * @example
 * const brand = yield* updateBrand({
 *   id: 'brand_abc123',
 *   data: { name: 'Updated Name', description: 'New description' },
 * });
 */
export const updateBrand = (input: UpdateBrandInput) =>
  Effect.gen(function* () {
    const brandRepo = yield* BrandRepo;

    // First verify ownership
    const brand = yield* brandRepo.findById(input.id);
    yield* requireOwnership(brand.createdBy);

    // Then update
    const updated = yield* brandRepo.update(input.id, input.data);

    return updated;
  }).pipe(
    Effect.withSpan('useCase.updateBrand', {
      attributes: { 'brand.id': input.id },
    }),
  );
