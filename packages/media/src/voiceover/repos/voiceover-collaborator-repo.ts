import { Context, Effect, Layer } from 'effect';
import {
  voiceoverCollaborator,
  user,
  type VoiceoverCollaborator,
  type VoiceoverCollaboratorWithUser,
  type VoiceoverId,
  type VoiceoverCollaboratorId,
} from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { eq, and, isNull } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

/**
 * Input for adding a voiceover collaborator.
 */
export interface AddVoiceoverCollaboratorInput {
  voiceoverId: VoiceoverId;
  email: string;
  userId?: string;
  addedBy: string;
}

/**
 * User info returned from lookupUserByEmail.
 */
export interface UserLookupInfo {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Repository interface for voiceover collaborator operations.
 * Handles raw database access without business logic.
 * All methods require Db context.
 */
export interface VoiceoverCollaboratorRepoService {
  /**
   * Find a collaborator by ID.
   */
  readonly findById: (
    id: VoiceoverCollaboratorId,
  ) => Effect.Effect<VoiceoverCollaborator | null, DatabaseError, Db>;

  /**
   * Find all collaborators for a voiceover with user info.
   */
  readonly findByVoiceover: (
    voiceoverId: VoiceoverId,
  ) => Effect.Effect<
    readonly VoiceoverCollaboratorWithUser[],
    DatabaseError,
    Db
  >;

  /**
   * Find all pending collaborator invites by email.
   * Used for claiming invites when a user registers.
   */
  readonly findByEmail: (
    email: string,
  ) => Effect.Effect<readonly VoiceoverCollaborator[], DatabaseError, Db>;

  /**
   * Find a collaborator by voiceover and user ID.
   */
  readonly findByVoiceoverAndUser: (
    voiceoverId: VoiceoverId,
    userId: string,
  ) => Effect.Effect<VoiceoverCollaborator | null, DatabaseError, Db>;

  /**
   * Find a collaborator by voiceover and email.
   */
  readonly findByVoiceoverAndEmail: (
    voiceoverId: VoiceoverId,
    email: string,
  ) => Effect.Effect<VoiceoverCollaborator | null, DatabaseError, Db>;

  /**
   * Look up a user by email.
   * Returns user info if found, null otherwise.
   */
  readonly lookupUserByEmail: (
    email: string,
  ) => Effect.Effect<UserLookupInfo | null, DatabaseError, Db>;

  /**
   * Add a new collaborator.
   */
  readonly add: (
    data: AddVoiceoverCollaboratorInput,
  ) => Effect.Effect<VoiceoverCollaborator, DatabaseError, Db>;

  /**
   * Remove a collaborator by ID.
   */
  readonly remove: (
    id: VoiceoverCollaboratorId,
  ) => Effect.Effect<boolean, DatabaseError, Db>;

  /**
   * Set hasApproved=true for a collaborator.
   */
  readonly approve: (
    voiceoverId: VoiceoverId,
    userId: string,
  ) => Effect.Effect<VoiceoverCollaborator | null, DatabaseError, Db>;

  /**
   * Set hasApproved=false for a collaborator.
   */
  readonly revokeApproval: (
    voiceoverId: VoiceoverId,
    userId: string,
  ) => Effect.Effect<VoiceoverCollaborator | null, DatabaseError, Db>;

  /**
   * Clear all approvals for a voiceover (set hasApproved=false for all).
   */
  readonly clearAllApprovals: (
    voiceoverId: VoiceoverId,
  ) => Effect.Effect<number, DatabaseError, Db>;

  /**
   * Claim pending invites by email (set userId for all matching email).
   * Returns the number of invites claimed.
   */
  readonly claimByEmail: (
    email: string,
    userId: string,
  ) => Effect.Effect<number, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class VoiceoverCollaboratorRepo extends Context.Tag(
  '@repo/media/VoiceoverCollaboratorRepo',
)<VoiceoverCollaboratorRepo, VoiceoverCollaboratorRepoService>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: VoiceoverCollaboratorRepoService = {
  findById: (id) =>
    withDb('voiceoverCollaboratorRepo.findById', async (db) => {
      const [collaborator] = await db
        .select()
        .from(voiceoverCollaborator)
        .where(eq(voiceoverCollaborator.id, id))
        .limit(1);
      return collaborator ?? null;
    }),

  findByVoiceover: (voiceoverId) =>
    withDb('voiceoverCollaboratorRepo.findByVoiceover', async (db) => {
      const rows = await db
        .select({
          collaborator: voiceoverCollaborator,
          userName: user.name,
          userImage: user.image,
        })
        .from(voiceoverCollaborator)
        .leftJoin(user, eq(voiceoverCollaborator.userId, user.id))
        .where(eq(voiceoverCollaborator.voiceoverId, voiceoverId))
        .orderBy(voiceoverCollaborator.addedAt);

      return rows.map((row) => ({
        ...row.collaborator,
        userName: row.userName,
        userImage: row.userImage,
      }));
    }),

  findByEmail: (email) =>
    withDb('voiceoverCollaboratorRepo.findByEmail', (db) =>
      db
        .select()
        .from(voiceoverCollaborator)
        .where(
          and(
            eq(voiceoverCollaborator.email, email),
            isNull(voiceoverCollaborator.userId),
          ),
        ),
    ),

  findByVoiceoverAndUser: (voiceoverId, userId) =>
    withDb('voiceoverCollaboratorRepo.findByVoiceoverAndUser', async (db) => {
      const [collaborator] = await db
        .select()
        .from(voiceoverCollaborator)
        .where(
          and(
            eq(voiceoverCollaborator.voiceoverId, voiceoverId),
            eq(voiceoverCollaborator.userId, userId),
          ),
        )
        .limit(1);
      return collaborator ?? null;
    }),

  findByVoiceoverAndEmail: (voiceoverId, email) =>
    withDb('voiceoverCollaboratorRepo.findByVoiceoverAndEmail', async (db) => {
      const [collaborator] = await db
        .select()
        .from(voiceoverCollaborator)
        .where(
          and(
            eq(voiceoverCollaborator.voiceoverId, voiceoverId),
            eq(voiceoverCollaborator.email, email),
          ),
        )
        .limit(1);
      return collaborator ?? null;
    }),

  lookupUserByEmail: (email) =>
    withDb('voiceoverCollaboratorRepo.lookupUserByEmail', async (db) => {
      const [foundUser] = await db
        .select({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
      return foundUser ?? null;
    }),

  add: (data) =>
    withDb('voiceoverCollaboratorRepo.add', async (db) => {
      const [collaborator] = await db
        .insert(voiceoverCollaborator)
        .values({
          voiceoverId: data.voiceoverId,
          email: data.email,
          userId: data.userId ?? null,
          addedBy: data.addedBy,
        })
        .returning();
      return collaborator!;
    }),

  remove: (id) =>
    withDb('voiceoverCollaboratorRepo.remove', async (db) => {
      const result = await db
        .delete(voiceoverCollaborator)
        .where(eq(voiceoverCollaborator.id, id))
        .returning({ id: voiceoverCollaborator.id });
      return result.length > 0;
    }),

  approve: (voiceoverId, userId) =>
    withDb('voiceoverCollaboratorRepo.approve', async (db) => {
      const [collaborator] = await db
        .update(voiceoverCollaborator)
        .set({
          hasApproved: true,
          approvedAt: new Date(),
        })
        .where(
          and(
            eq(voiceoverCollaborator.voiceoverId, voiceoverId),
            eq(voiceoverCollaborator.userId, userId),
          ),
        )
        .returning();
      return collaborator ?? null;
    }),

  revokeApproval: (voiceoverId, userId) =>
    withDb('voiceoverCollaboratorRepo.revokeApproval', async (db) => {
      const [collaborator] = await db
        .update(voiceoverCollaborator)
        .set({
          hasApproved: false,
          approvedAt: null,
        })
        .where(
          and(
            eq(voiceoverCollaborator.voiceoverId, voiceoverId),
            eq(voiceoverCollaborator.userId, userId),
          ),
        )
        .returning();
      return collaborator ?? null;
    }),

  clearAllApprovals: (voiceoverId) =>
    withDb('voiceoverCollaboratorRepo.clearAllApprovals', async (db) => {
      const result = await db
        .update(voiceoverCollaborator)
        .set({
          hasApproved: false,
          approvedAt: null,
        })
        .where(eq(voiceoverCollaborator.voiceoverId, voiceoverId))
        .returning({ id: voiceoverCollaborator.id });
      return result.length;
    }),

  claimByEmail: (email, userId) =>
    withDb('voiceoverCollaboratorRepo.claimByEmail', async (db) => {
      const result = await db
        .update(voiceoverCollaborator)
        .set({ userId })
        .where(
          and(
            eq(voiceoverCollaborator.email, email),
            isNull(voiceoverCollaborator.userId),
          ),
        )
        .returning({ id: voiceoverCollaborator.id });
      return result.length;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const VoiceoverCollaboratorRepoLive: Layer.Layer<
  VoiceoverCollaboratorRepo,
  never,
  Db
> = Layer.succeed(VoiceoverCollaboratorRepo, make);
