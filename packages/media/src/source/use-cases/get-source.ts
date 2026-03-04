import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SourceRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GetSourceInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const getSource = (input: GetSourceInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const sourceRepo = yield* SourceRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'source.id': input.id },
    });
    const doc = yield* sourceRepo.findByIdForUser(input.id, user.id);

    return doc;
  }).pipe(withUseCaseSpan('useCase.getSource'));
