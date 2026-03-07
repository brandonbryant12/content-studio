import { Effect } from 'effect';
import type { UpdateVoiceover } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface UpdateVoiceoverInput {
  voiceoverId: string;
  data: UpdateVoiceover;
}

// =============================================================================
// Use Case
// =============================================================================

export const updateVoiceover = defineAuthedUseCase<UpdateVoiceoverInput>()({
  name: 'useCase.updateVoiceover',
  span: ({ input }) => ({
    resourceId: input.voiceoverId,
    attributes: { 'voiceover.id': input.voiceoverId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const voiceoverRepo = yield* VoiceoverRepo;
      yield* voiceoverRepo.findByIdForUser(input.voiceoverId, user.id);

      return yield* voiceoverRepo.update(input.voiceoverId, input.data);
    }),
});
