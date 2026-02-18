import { requireOwnership } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { InfographicFormat, StyleProperty } from '@repo/db/schema';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface UpdateInfographicInput {
  id: string;
  title?: string;
  prompt?: string;
  styleProperties?: readonly StyleProperty[];
  format?: InfographicFormat;
}

// =============================================================================
// Use Case
// =============================================================================

export const updateInfographic = (input: UpdateInfographicInput) =>
  Effect.gen(function* () {
    const repo = yield* InfographicRepo;

    const existing = yield* repo.findById(input.id);
    yield* requireOwnership(existing.createdBy);

    return yield* repo.update(input.id, {
      title: input.title,
      prompt: input.prompt,
      styleProperties: input.styleProperties
        ? [...input.styleProperties]
        : undefined,
      format: input.format,
    });
  }).pipe(
    Effect.withSpan('useCase.updateInfographic', {
      attributes: { 'infographic.id': input.id },
    }),
  );
