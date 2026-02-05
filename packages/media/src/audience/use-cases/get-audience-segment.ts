import { Effect } from 'effect';
import { AudienceSegmentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GetAudienceSegmentInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const getAudienceSegment = (input: GetAudienceSegmentInput) =>
  Effect.gen(function* () {
    const repo = yield* AudienceSegmentRepo;
    return yield* repo.findById(input.id);
  }).pipe(
    Effect.withSpan('useCase.getAudienceSegment', {
      attributes: { 'audienceSegment.id': input.id },
    }),
  );
