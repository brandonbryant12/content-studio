import { Effect } from 'effect';
import type { VoiceoverCollaboratorWithUser, VoiceoverId } from '@repo/db/schema';
import { VoiceoverCollaboratorRepo } from '../repos/voiceover-collaborator-repo';

// =============================================================================
// Types
// =============================================================================

export interface ListVoiceoverCollaboratorsInput {
  voiceoverId: string;
}

export interface ListVoiceoverCollaboratorsResult {
  collaborators: readonly VoiceoverCollaboratorWithUser[];
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * List all collaborators for a voiceover.
 *
 * This use case:
 * 1. Loads all collaborators for the voiceover with user info
 *
 * @example
 * const result = yield* listVoiceoverCollaborators({
 *   voiceoverId: 'voc_xxx',
 * });
 */
export const listVoiceoverCollaborators = (input: ListVoiceoverCollaboratorsInput) =>
  Effect.gen(function* () {
    const collaboratorRepo = yield* VoiceoverCollaboratorRepo;

    const collaborators = yield* collaboratorRepo.findByVoiceover(
      input.voiceoverId as VoiceoverId,
    );

    return { collaborators };
  }).pipe(
    Effect.withSpan('useCase.listVoiceoverCollaborators', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
