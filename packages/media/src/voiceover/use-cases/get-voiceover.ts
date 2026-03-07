import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface GetVoiceoverInput {
  voiceoverId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get a voiceover by ID.
 *
 * @example
 * const voiceover = yield* getVoiceover({ voiceoverId: 'voc_xxx' });
 */
export const getVoiceover = defineAuthedUseCase<GetVoiceoverInput>()({
  name: 'useCase.getVoiceover',
  span: ({ input }) => ({
    resourceId: input.voiceoverId,
    attributes: { 'voiceover.id': input.voiceoverId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const voiceoverRepo = yield* VoiceoverRepo;
      return yield* user.role === Role.ADMIN
        ? voiceoverRepo.findById(input.voiceoverId)
        : voiceoverRepo.findByIdForUser(input.voiceoverId, user.id);
    }),
});
