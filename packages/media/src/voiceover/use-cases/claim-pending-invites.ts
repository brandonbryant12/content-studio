import { Effect } from 'effect';
import { VoiceoverCollaboratorRepo } from '../repos/voiceover-collaborator-repo';

// =============================================================================
// Types
// =============================================================================

export interface ClaimVoiceoverPendingInvitesInput {
  email: string;
  userId: string;
}

export interface ClaimVoiceoverPendingInvitesResult {
  claimedCount: number;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Claim pending voiceover collaborator invites for a newly registered or logged-in user.
 *
 * This use case should be called when:
 * - A user signs up with an email that has pending invites
 * - A user logs in (to catch any invites sent while they were logged out)
 *
 * It updates all collaborator records with matching email and null userId
 * to set the userId field.
 *
 * @example
 * const result = yield* claimVoiceoverPendingInvites({
 *   email: 'user@example.com',
 *   userId: 'user-123',
 * });
 * // result.claimedCount === 2 (if there were 2 pending invites)
 */
export const claimVoiceoverPendingInvites = (input: ClaimVoiceoverPendingInvitesInput) =>
  Effect.gen(function* () {
    const collaboratorRepo = yield* VoiceoverCollaboratorRepo;

    // Claim all pending invites for this email
    const claimedCount = yield* collaboratorRepo.claimByEmail(
      input.email,
      input.userId,
    );

    return { claimedCount };
  }).pipe(
    Effect.withSpan('useCase.claimVoiceoverPendingInvites', {
      attributes: { 'user.email': input.email },
    }),
  );
