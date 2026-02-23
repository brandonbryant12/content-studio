import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { InfographicFormat, StyleProperty } from '@repo/db/schema';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { InfographicRepo } from '../repos';
import { sanitizeStyleProperties } from '../style-properties';

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
    const user = yield* getCurrentUser;
    const repo = yield* InfographicRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'infographic.id': input.id },
    });
    yield* repo.findByIdForUser(input.id, user.id);

    return yield* repo.update(input.id, {
      title: input.title,
      prompt: input.prompt,
      styleProperties: input.styleProperties
        ? sanitizeStyleProperties(input.styleProperties)
        : undefined,
      format: input.format,
    });
  }).pipe(withUseCaseSpan('useCase.updateInfographic'));
