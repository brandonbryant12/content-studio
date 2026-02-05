import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { AudienceSegmentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface ListAudienceSegmentsInput {
  limit?: number;
  offset?: number;
}

// =============================================================================
// Use Case
// =============================================================================

export const listAudienceSegments = (input: ListAudienceSegmentsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* AudienceSegmentRepo;

    return yield* repo.list({
      createdBy: user.id,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    });
  }).pipe(
    Effect.withSpan('useCase.listAudienceSegments', {
      attributes: {
        'pagination.limit': input.limit,
        'pagination.offset': input.offset,
      },
    }),
  );
