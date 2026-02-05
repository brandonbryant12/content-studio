import { Effect } from 'effect';
import type { CreateAudienceSegment } from '@repo/db/schema';
import { generateAudienceSegmentId } from '@repo/db/schema';
import { getCurrentUser } from '@repo/auth/policy';
import { AudienceSegmentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface CreateAudienceSegmentInput extends CreateAudienceSegment {}

// =============================================================================
// Use Case
// =============================================================================

export const createAudienceSegment = (input: CreateAudienceSegmentInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* AudienceSegmentRepo;

    return yield* repo.insert({
      id: generateAudienceSegmentId(),
      name: input.name,
      description: input.description,
      messagingTone: input.messagingTone,
      keyInterests: input.keyInterests,
      createdBy: user.id,
    });
  }).pipe(
    Effect.withSpan('useCase.createAudienceSegment', {
      attributes: { 'audienceSegment.name': input.name },
    }),
  );
