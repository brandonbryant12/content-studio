import { getCurrentUser } from '@repo/auth/policy';
import {
  generateInfographicId,
  type InfographicFormat,
  type StyleProperty,
} from '@repo/db/schema';
import { Effect } from 'effect';
import { InfographicRepo } from '../repos';
import { sanitizeStyleProperties } from '../style-properties';

// =============================================================================
// Types
// =============================================================================

export interface CreateInfographicInput {
  title: string;
  format: InfographicFormat;
  prompt?: string;
  styleProperties?: readonly StyleProperty[];
}

// =============================================================================
// Use Case
// =============================================================================

export const createInfographic = (input: CreateInfographicInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* InfographicRepo;

    return yield* repo.insert({
      id: generateInfographicId(),
      title: input.title,
      prompt: input.prompt,
      styleProperties: sanitizeStyleProperties(input.styleProperties ?? []),
      format: input.format,
      status: 'draft',
      createdBy: user.id,
    });
  }).pipe(Effect.withSpan('useCase.createInfographic'));
