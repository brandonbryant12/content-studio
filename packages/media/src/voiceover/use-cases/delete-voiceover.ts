import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface DeleteVoiceoverInput {
  voiceoverId: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const deleteVoiceover = defineAuthedUseCase<DeleteVoiceoverInput>()({
  name: 'useCase.deleteVoiceover',
  span: ({ input }) => ({
    resourceId: input.voiceoverId,
    attributes: { 'voiceover.id': input.voiceoverId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const voiceoverRepo = yield* VoiceoverRepo;
      yield* voiceoverRepo.findByIdForUser(input.voiceoverId, user.id);

      yield* voiceoverRepo.delete(input.voiceoverId);
    }),
});
