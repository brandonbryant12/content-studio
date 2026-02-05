import { Effect } from 'effect';
import { AudienceSegmentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface DeleteAudienceSegmentInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const deleteAudienceSegment = (input: DeleteAudienceSegmentInput) =>
  Effect.gen(function* () {
    const repo = yield* AudienceSegmentRepo;
    return yield* repo.delete(input.id);
  }).pipe(
    Effect.withSpan('useCase.deleteAudienceSegment', {
      attributes: { 'audienceSegment.id': input.id },
    }),
  );
