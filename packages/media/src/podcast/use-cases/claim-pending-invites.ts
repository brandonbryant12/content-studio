import { Effect } from 'effect';
import { CollaboratorRepo } from '../repos/collaborator-repo';

// =============================================================================
// Types
// =============================================================================

export interface ClaimPendingInvitesInput {
  email: string;
  userId: string;
}

export interface ClaimPendingInvitesResult {
  claimedCount: number;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Claim pending collaborator invites for a newly registered or logged-in user.
 *
 * This use case should be called when:
 * - A user signs up with an email that has pending invites
 * - A user logs in (to catch any invites sent while they were logged out)
 *
 * It updates all collaborator records with matching email and null userId
 * to set the userId field.
 *
 * @example
 * const result = yield* claimPendingInvites({
 *   email: 'user@example.com',
 *   userId: 'user-123',
 * });
 * // result.claimedCount === 2 (if there were 2 pending invites)
 */
export const claimPendingInvites = (input: ClaimPendingInvitesInput) =>
  Effect.gen(function* () {
    const collaboratorRepo = yield* CollaboratorRepo;

    // Claim all pending invites for this email
    const claimedCount = yield* collaboratorRepo.claimByEmail(
      input.email,
      input.userId,
    );

    return { claimedCount };
  }).pipe(
    Effect.withSpan('useCase.claimPendingInvites', {
      attributes: { 'user.email': input.email },
    }),
  );
