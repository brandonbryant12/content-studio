import { Effect } from 'effect';
import {
  generateInfographicId,
  type InfographicType,
  type InfographicStyle,
  type InfographicFormat,
} from '@repo/db/schema';
import { getCurrentUser } from '@repo/auth/policy';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface CreateInfographicInput {
  title: string;
  infographicType: InfographicType;
  stylePreset: InfographicStyle;
  format: InfographicFormat;
  prompt?: string;
  sourceDocumentIds?: readonly string[];
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
      infographicType: input.infographicType,
      stylePreset: input.stylePreset,
      format: input.format,
      sourceDocumentIds: input.sourceDocumentIds,
      status: 'draft',
      createdBy: user.id,
    });
  }).pipe(Effect.withSpan('useCase.createInfographic'));
