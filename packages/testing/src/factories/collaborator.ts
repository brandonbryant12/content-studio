import {
  generateCollaboratorId,
  type CollaboratorId,
  type Collaborator,
  type CollaboratorWithUser,
  type PodcastId,
} from '@repo/db/schema';

/**
 * Options for creating a test collaborator.
 */
export interface CreateTestCollaboratorOptions {
  id?: CollaboratorId;
  podcastId?: PodcastId;
  userId?: string | null;
  email?: string;
  addedAt?: Date;
  addedBy?: string;
}

let collaboratorCounter = 0;

/**
 * Create a test collaborator with default values.
 */
export const createTestCollaborator = (
  options: CreateTestCollaboratorOptions = {},
): Collaborator => {
  collaboratorCounter++;
  const now = new Date();

  return {
    id: options.id ?? generateCollaboratorId(),
    podcastId: options.podcastId ?? ('pod_test0000000001' as PodcastId),
    userId: options.userId ?? null,
    email: options.email ?? `collaborator${collaboratorCounter}@example.com`,
    addedAt: options.addedAt ?? now,
    addedBy: options.addedBy ?? 'test-owner-id',
  };
};

/**
 * Create a test collaborator with user info.
 */
export const createTestCollaboratorWithUser = (
  options: CreateTestCollaboratorOptions & {
    userName?: string | null;
    userImage?: string | null;
  } = {},
): CollaboratorWithUser => {
  collaboratorCounter++;
  const now = new Date();

  return {
    id: options.id ?? generateCollaboratorId(),
    podcastId: options.podcastId ?? ('pod_test0000000001' as PodcastId),
    userId: options.userId ?? null,
    email: options.email ?? `collaborator${collaboratorCounter}@example.com`,
    addedAt: options.addedAt ?? now,
    addedBy: options.addedBy ?? 'test-owner-id',
    userName: options.userName ?? null,
    userImage: options.userImage ?? null,
  };
};

/**
 * Reset the collaborator counter (call in beforeEach for consistent test data).
 */
export const resetCollaboratorCounter = () => {
  collaboratorCounter = 0;
};
