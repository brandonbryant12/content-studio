import { Effect } from 'effect';
import type {
  InfographicType,
  InfographicStyle,
  InfographicFormat,
} from '@repo/db/schema';
import { requireOwnership } from '@repo/auth/policy';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface UpdateInfographicInput {
  id: string;
  title?: string;
  prompt?: string;
  infographicType?: InfographicType;
  stylePreset?: InfographicStyle;
  format?: InfographicFormat;
  sourceDocumentIds?: readonly string[];
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
      infographicType: input.infographicType,
      stylePreset: input.stylePreset,
      format: input.format,
      sourceDocumentIds: input.sourceDocumentIds,
    });
  }).pipe(
    Effect.withSpan('useCase.updateInfographic', {
      attributes: { 'infographic.id': input.id },
    }),
  );
