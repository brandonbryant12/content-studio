import { Effect } from 'effect';
import type { CreateBrand, Brand } from '@repo/db/schema';
import { getCurrentUser } from '@repo/auth/policy';
import { BrandRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface CreateBrandInput extends CreateBrand {}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Create a new brand.
 *
 * This use case:
 * 1. Gets the current user from context
 * 2. Creates the brand in the database with the user as owner
 *
 * @example
 * const brand = yield* createBrand({
 *   name: 'My Brand',
 *   description: 'Brand description',
 *   mission: 'Our mission statement',
 *   values: ['Innovation', 'Quality'],
 * });
 */
export const createBrand = (input: CreateBrandInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const brandRepo = yield* BrandRepo;

    const brand = yield* brandRepo.insert({
      ...input,
      createdBy: user.id,
    });

    return brand;
  }).pipe(
    Effect.withSpan('useCase.createBrand', {
      attributes: { 'brand.name': input.name },
    }),
  );
