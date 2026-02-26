import { getCurrentUser } from '@repo/auth/policy';
import {
  generateInfographicId,
  InfographicStatus,
  type InfographicFormat,
  type StyleProperty,
} from '@repo/db/schema';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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

    const infographic = yield* repo.insert({
      id: generateInfographicId(),
      title: input.title,
      prompt: input.prompt,
      styleProperties: sanitizeStyleProperties(input.styleProperties ?? []),
      format: input.format,
      status: InfographicStatus.DRAFT,
      createdBy: user.id,
    });
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: infographic.id,
      attributes: { 'infographic.id': infographic.id },
    });
    return infographic;
  }).pipe(withUseCaseSpan('useCase.createInfographic'));
