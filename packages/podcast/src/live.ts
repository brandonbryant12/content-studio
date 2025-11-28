import { Effect, Layer } from 'effect';
import { Podcasts, type PodcastService } from './service';
import { PodcastNotFound } from './errors';
import { CurrentUser, requireOwnership, Role } from '@repo/auth-policy';
import { Db } from '@repo/effect/db';
import * as Repo from './repository';

/**
 * Live podcast service implementation.
 */
const makePodcastService: PodcastService = {
  create: (data) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const { documentIds, ...podcastData } = data;

      // Verify all documents exist
      yield* Repo.verifyDocumentsExist(documentIds);

      // Create podcast with document links
      const result = yield* Repo.insertPodcast(
        {
          ...podcastData,
          createdBy: user.id,
        },
        documentIds,
      );

      return result;
    }).pipe(Effect.withSpan('podcasts.create')),

  findById: (id) =>
    Effect.gen(function* () {
      const podcast = yield* Repo.findPodcastById(id);
      yield* requireOwnership(podcast.createdBy);
      return podcast;
    }).pipe(
      Effect.withSpan('podcasts.findById', {
        attributes: { 'podcast.id': id },
      }),
    ),

  list: (options) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const isAdmin = user.role === Role.ADMIN;

      return yield* Repo.listPodcasts({
        createdBy: isAdmin ? undefined : user.id,
        status: options?.status,
        limit: options?.limit,
        offset: options?.offset,
      });
    }).pipe(Effect.withSpan('podcasts.list')),

  update: (id, data) =>
    Effect.gen(function* () {
      // Verify access
      const existing = yield* Repo.findPodcastById(id);
      yield* requireOwnership(existing.createdBy);

      return yield* Repo.updatePodcast(id, data);
    }).pipe(
      Effect.withSpan('podcasts.update', {
        attributes: { 'podcast.id': id },
      }),
    ),

  delete: (id) =>
    Effect.gen(function* () {
      const existing = yield* Repo.findPodcastById(id);
      yield* requireOwnership(existing.createdBy);

      const deleted = yield* Repo.deletePodcast(id);
      if (!deleted) {
        return yield* Effect.fail(new PodcastNotFound({ id }));
      }
    }).pipe(
      Effect.withSpan('podcasts.delete', {
        attributes: { 'podcast.id': id },
      }),
    ),

  getScript: (podcastId) =>
    Effect.gen(function* () {
      // Verify access to podcast first
      const existing = yield* Repo.findPodcastById(podcastId);
      yield* requireOwnership(existing.createdBy);

      return yield* Repo.getActiveScript(podcastId);
    }).pipe(
      Effect.withSpan('podcasts.getScript', {
        attributes: { 'podcast.id': podcastId },
      }),
    ),

  updateScript: (podcastId, data) =>
    Effect.gen(function* () {
      const existing = yield* Repo.findPodcastById(podcastId);
      yield* requireOwnership(existing.createdBy);

      return yield* Repo.upsertScript(podcastId, data);
    }).pipe(
      Effect.withSpan('podcasts.updateScript', {
        attributes: { 'podcast.id': podcastId },
      }),
    ),

  setStatus: (id, status, errorMessage) =>
    Repo.updatePodcastStatus(id, status, errorMessage).pipe(
      Effect.withSpan('podcasts.setStatus', {
        attributes: { 'podcast.id': id, 'podcast.status': status },
      }),
    ),

  count: (options) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const isAdmin = user.role === Role.ADMIN;

      return yield* Repo.countPodcasts({
        createdBy: isAdmin ? undefined : user.id,
        status: options?.status,
      });
    }).pipe(Effect.withSpan('podcasts.count')),
};

/**
 * Live layer for podcast service.
 *
 * Requires:
 * - Db: Database connection
 * - CurrentUser: Authenticated user context
 */
export const PodcastsLive: Layer.Layer<Podcasts, never, Db | CurrentUser> = Layer.succeed(
  Podcasts,
  makePodcastService,
);
