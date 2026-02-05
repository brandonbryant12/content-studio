import { Effect } from 'effect';
import type { UpdateAudienceSegment } from '@repo/db/schema';
import { AudienceSegmentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface UpdateAudienceSegmentInput extends UpdateAudienceSegment {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const updateAudienceSegment = (input: UpdateAudienceSegmentInput) =>
  Effect.gen(function* () {
    const repo = yield* AudienceSegmentRepo;
    const { id, ...data } = input;
    return yield* repo.update(id, data);
  }).pipe(
    Effect.withSpan('useCase.updateAudienceSegment', {
      attributes: { 'audienceSegment.id': input.id },
    }),
  );
