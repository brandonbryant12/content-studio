import { getCurrentUser } from '@repo/auth/policy';
import type { StyleProperty } from '@repo/db/schema';
import { Effect } from 'effect';
import { StylePresetRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface CreateStylePresetInput {
  name: string;
  properties: readonly StyleProperty[];
}

// =============================================================================
// Use Case
// =============================================================================

export const createStylePreset = (input: CreateStylePresetInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* StylePresetRepo;

    return yield* repo.insert({
      name: input.name,
      properties: [...input.properties],
      isBuiltIn: false,
      createdBy: user.id,
    });
  }).pipe(Effect.withSpan('useCase.createStylePreset'));
