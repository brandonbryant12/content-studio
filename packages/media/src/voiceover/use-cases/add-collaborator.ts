import { Effect } from 'effect';
import type { VoiceoverCollaboratorWithUser } from '@repo/db/schema';
import { VoiceoverRepo } from '../repos/voiceover-repo';
import { VoiceoverCollaboratorRepo } from '../repos/voiceover-collaborator-repo';
import {
  NotVoiceoverOwner,
  VoiceoverCollaboratorAlreadyExists,
  CannotAddOwnerAsVoiceoverCollaborator,
} from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface AddVoiceoverCollaboratorInput {
  voiceoverId: string;
  email: string;
  addedBy: string; // User ID of the person adding the collaborator
}

export interface AddVoiceoverCollaboratorResult {
  collaborator: VoiceoverCollaboratorWithUser;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Add a collaborator to a voiceover.
 *
 * This use case:
 * 1. Verifies the addedBy user is the voiceover owner
 * 2. Checks if the email is the owner's email (cannot add owner as collaborator)
 * 3. Checks if a collaborator with this email already exists
 * 4. Looks up if the email belongs to an existing user
 * 5. Creates the collaborator record
 *
 * @example
 * const result = yield* addVoiceoverCollaborator({
 *   voiceoverId: 'voc_xxx',
 *   email: 'collaborator@example.com',
 *   addedBy: 'user-123',
 * });
 */
export const addVoiceoverCollaborator = (
  input: AddVoiceoverCollaboratorInput,
) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;
    const collaboratorRepo = yield* VoiceoverCollaboratorRepo;

    // 1. Load voiceover and verify ownership
    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

    if (voiceover.createdBy !== input.addedBy) {
      return yield* Effect.fail(
        new NotVoiceoverOwner({
          voiceoverId: input.voiceoverId,
          userId: input.addedBy,
        }),
      );
    }

    // 2. Look up if the email belongs to an existing user
    const userInfo = yield* collaboratorRepo.lookupUserByEmail(input.email);

    // 3. Check if this is the owner's email
    if (userInfo && userInfo.id === voiceover.createdBy) {
      return yield* Effect.fail(
        new CannotAddOwnerAsVoiceoverCollaborator({
          voiceoverId: input.voiceoverId,
          email: input.email,
        }),
      );
    }

    // 4. Check if collaborator already exists
    const existing = yield* collaboratorRepo.findByVoiceoverAndEmail(
      voiceover.id,
      input.email,
    );

    if (existing) {
      return yield* Effect.fail(
        new VoiceoverCollaboratorAlreadyExists({
          voiceoverId: input.voiceoverId,
          email: input.email,
        }),
      );
    }

    // 5. Create the collaborator
    const collaborator = yield* collaboratorRepo.add({
      voiceoverId: voiceover.id,
      email: input.email,
      userId: userInfo?.id,
      addedBy: input.addedBy,
    });

    // Return with user info
    const result: VoiceoverCollaboratorWithUser = {
      ...collaborator,
      userName: userInfo?.name ?? null,
      userImage: userInfo?.image ?? null,
    };

    return { collaborator: result };
  }).pipe(
    Effect.withSpan('useCase.addVoiceoverCollaborator', {
      attributes: {
        'voiceover.id': input.voiceoverId,
        'collaborator.email': input.email,
      },
    }),
  );
