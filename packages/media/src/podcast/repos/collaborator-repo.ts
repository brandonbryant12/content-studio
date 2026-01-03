import { Context, Effect, Layer } from 'effect';
import {
  podcastCollaborator,
  user,
  type Collaborator,
  type CollaboratorWithUser,
  type PodcastId,
  type CollaboratorId,
} from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { eq, and, isNull } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

/**
 * Input for adding a collaborator.
 */
export interface AddCollaboratorInput {
  podcastId: PodcastId;
  email: string;
  userId?: string;
  addedBy: string;
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * User info returned from lookupUserByEmail.
 */
export interface UserLookupInfo {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

/**
 * Repository interface for collaborator operations.
 * Handles raw database access without business logic.
 * All methods require Db context.
 */
export interface CollaboratorRepoService {
  /**
   * Find a collaborator by ID.
   */
  readonly findById: (
    id: CollaboratorId,
  ) => Effect.Effect<Collaborator | null, DatabaseError, Db>;

  /**
   * Find all collaborators for a podcast with user info.
   */
  readonly findByPodcast: (
    podcastId: PodcastId,
  ) => Effect.Effect<readonly CollaboratorWithUser[], DatabaseError, Db>;

  /**
   * Find all pending collaborator invites by email.
   * Used for claiming invites when a user registers.
   */
  readonly findByEmail: (
    email: string,
  ) => Effect.Effect<readonly Collaborator[], DatabaseError, Db>;

  /**
   * Find a collaborator by podcast and user ID.
   */
  readonly findByPodcastAndUser: (
    podcastId: PodcastId,
    userId: string,
  ) => Effect.Effect<Collaborator | null, DatabaseError, Db>;

  /**
   * Find a collaborator by podcast and email.
   */
  readonly findByPodcastAndEmail: (
    podcastId: PodcastId,
    email: string,
  ) => Effect.Effect<Collaborator | null, DatabaseError, Db>;

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
    data: AddCollaboratorInput,
  ) => Effect.Effect<Collaborator, DatabaseError, Db>;

  /**
   * Remove a collaborator by ID.
   */
  readonly remove: (
    id: CollaboratorId,
  ) => Effect.Effect<boolean, DatabaseError, Db>;

  /**
   * Set hasApproved=true for a collaborator.
   */
  readonly approve: (
    podcastId: PodcastId,
    userId: string,
  ) => Effect.Effect<Collaborator | null, DatabaseError, Db>;

  /**
   * Set hasApproved=false for a collaborator.
   */
  readonly revokeApproval: (
    podcastId: PodcastId,
    userId: string,
  ) => Effect.Effect<Collaborator | null, DatabaseError, Db>;

  /**
   * Clear all approvals for a podcast (set hasApproved=false for all).
   */
  readonly clearAllApprovals: (
    podcastId: PodcastId,
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

export class CollaboratorRepo extends Context.Tag(
  '@repo/media/CollaboratorRepo',
)<CollaboratorRepo, CollaboratorRepoService>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: CollaboratorRepoService = {
  findById: (id) =>
    withDb('collaboratorRepo.findById', async (db) => {
      const [collaborator] = await db
        .select()
        .from(podcastCollaborator)
        .where(eq(podcastCollaborator.id, id))
        .limit(1);
      return collaborator ?? null;
    }),

  findByPodcast: (podcastId) =>
    withDb('collaboratorRepo.findByPodcast', async (db) => {
      const rows = await db
        .select({
          collaborator: podcastCollaborator,
          userName: user.name,
          userImage: user.image,
        })
        .from(podcastCollaborator)
        .leftJoin(user, eq(podcastCollaborator.userId, user.id))
        .where(eq(podcastCollaborator.podcastId, podcastId))
        .orderBy(podcastCollaborator.addedAt);

      return rows.map((row) => ({
        ...row.collaborator,
        userName: row.userName,
        userImage: row.userImage,
      }));
    }),

  findByEmail: (email) =>
    withDb('collaboratorRepo.findByEmail', (db) =>
      db
        .select()
        .from(podcastCollaborator)
        .where(
          and(
            eq(podcastCollaborator.email, email),
            isNull(podcastCollaborator.userId),
          ),
        ),
    ),

  findByPodcastAndUser: (podcastId, userId) =>
    withDb('collaboratorRepo.findByPodcastAndUser', async (db) => {
      const [collaborator] = await db
        .select()
        .from(podcastCollaborator)
        .where(
          and(
            eq(podcastCollaborator.podcastId, podcastId),
            eq(podcastCollaborator.userId, userId),
          ),
        )
        .limit(1);
      return collaborator ?? null;
    }),

  findByPodcastAndEmail: (podcastId, email) =>
    withDb('collaboratorRepo.findByPodcastAndEmail', async (db) => {
      const [collaborator] = await db
        .select()
        .from(podcastCollaborator)
        .where(
          and(
            eq(podcastCollaborator.podcastId, podcastId),
            eq(podcastCollaborator.email, email),
          ),
        )
        .limit(1);
      return collaborator ?? null;
    }),

  lookupUserByEmail: (email) =>
    withDb('collaboratorRepo.lookupUserByEmail', async (db) => {
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
    withDb('collaboratorRepo.add', async (db) => {
      const [collaborator] = await db
        .insert(podcastCollaborator)
        .values({
          podcastId: data.podcastId,
          email: data.email,
          userId: data.userId ?? null,
          addedBy: data.addedBy,
        })
        .returning();
      return collaborator!;
    }),

  remove: (id) =>
    withDb('collaboratorRepo.remove', async (db) => {
      const result = await db
        .delete(podcastCollaborator)
        .where(eq(podcastCollaborator.id, id))
        .returning({ id: podcastCollaborator.id });
      return result.length > 0;
    }),

  approve: (podcastId, userId) =>
    withDb('collaboratorRepo.approve', async (db) => {
      const [collaborator] = await db
        .update(podcastCollaborator)
        .set({
          hasApproved: true,
          approvedAt: new Date(),
        })
        .where(
          and(
            eq(podcastCollaborator.podcastId, podcastId),
            eq(podcastCollaborator.userId, userId),
          ),
        )
        .returning();
      return collaborator ?? null;
    }),

  revokeApproval: (podcastId, userId) =>
    withDb('collaboratorRepo.revokeApproval', async (db) => {
      const [collaborator] = await db
        .update(podcastCollaborator)
        .set({
          hasApproved: false,
          approvedAt: null,
        })
        .where(
          and(
            eq(podcastCollaborator.podcastId, podcastId),
            eq(podcastCollaborator.userId, userId),
          ),
        )
        .returning();
      return collaborator ?? null;
    }),

  clearAllApprovals: (podcastId) =>
    withDb('collaboratorRepo.clearAllApprovals', async (db) => {
      const result = await db
        .update(podcastCollaborator)
        .set({
          hasApproved: false,
          approvedAt: null,
        })
        .where(eq(podcastCollaborator.podcastId, podcastId))
        .returning({ id: podcastCollaborator.id });
      return result.length;
    }),

  claimByEmail: (email, userId) =>
    withDb('collaboratorRepo.claimByEmail', async (db) => {
      const result = await db
        .update(podcastCollaborator)
        .set({ userId })
        .where(
          and(
            eq(podcastCollaborator.email, email),
            isNull(podcastCollaborator.userId),
          ),
        )
        .returning({ id: podcastCollaborator.id });
      return result.length;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const CollaboratorRepoLive: Layer.Layer<CollaboratorRepo, never, Db> =
  Layer.succeed(CollaboratorRepo, make);
