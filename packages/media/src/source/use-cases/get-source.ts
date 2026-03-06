import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
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

export const getSource = defineAuthedUseCase<GetSourceInput>()({
  name: 'useCase.getSource',
  span: ({ input }) => ({
    resourceId: input.id,
    attributes: { 'source.id': input.id },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const sourceRepo = yield* SourceRepo;
      return yield* user.role === Role.ADMIN
        ? sourceRepo.findById(input.id)
        : sourceRepo.findByIdForUser(input.id, user.id);
    }),
});
