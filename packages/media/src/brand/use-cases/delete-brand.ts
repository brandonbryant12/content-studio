import { Effect } from 'effect';
import { requireOwnership } from '@repo/auth/policy';
import { BrandRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface DeleteBrandInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Delete a brand.
 *
 * This use case:
 * 1. Fetches the existing brand
 * 2. Verifies ownership (owner or admin)
 * 3. Deletes the brand from database
 *
 * @example
 * yield* deleteBrand({ id: 'brand_abc123' });
 */
export const deleteBrand = (input: DeleteBrandInput) =>
  Effect.gen(function* () {
    const brandRepo = yield* BrandRepo;

    // Fetch existing brand and verify ownership
    const existing = yield* brandRepo.findById(input.id);
    yield* requireOwnership(existing.createdBy);

    // Delete brand from DB
    yield* brandRepo.delete(input.id);
  }).pipe(
    Effect.withSpan('useCase.deleteBrand', {
      attributes: { 'brand.id': input.id },
    }),
  );
