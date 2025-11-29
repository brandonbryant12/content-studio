import { JobProcessingError } from '@repo/effect/errors';
import { Podcasts, PodcastGenerator } from '@repo/podcast';
import { Queue } from '@repo/queue';
import { Effect } from 'effect';
import type { GeneratePodcastPayload, Job } from '@repo/queue';
import { handleEffect } from '../effect-handler';
import { protectedProcedure } from '../orpc';

/**
 * Serialize Date fields to ISO strings for API output.
 * We use explicit any types since the serialization is straightforward
 * and the contract schemas validate the output shape.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const serializePodcast = (podcast: any): any => ({
  ...podcast,
  createdAt: podcast.createdAt.toISOString(),
  updatedAt: podcast.updatedAt.toISOString(),
});

const serializeScript = (script: any): any => ({
  ...script,
  createdAt: script.createdAt.toISOString(),
  updatedAt: script.updatedAt.toISOString(),
});

const serializePodcastFull = (podcast: any): any => ({
  ...podcast,
  createdAt: podcast.createdAt.toISOString(),
  updatedAt: podcast.updatedAt.toISOString(),
  documents: podcast.documents.map((d: any) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  })),
  script: podcast.script
    ? {
        ...podcast.script,
        createdAt: podcast.script.createdAt.toISOString(),
        updatedAt: podcast.script.updatedAt.toISOString(),
      }
    : null,
});

const serializeJob = (job: any): any => ({
  ...job,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
  startedAt: job.startedAt?.toISOString() ?? null,
  completedAt: job.completedAt?.toISOString() ?? null,
});

/* eslint-enable @typescript-eslint/no-explicit-any */

const podcastRouter = {
  list: protectedProcedure.podcasts.list.handler(async ({ context, input, errors }) => {
    return handleEffect(
      Effect.gen(function* () {
        const podcasts = yield* Podcasts;
        const result = yield* podcasts.list(input);
        return result.map(serializePodcast);
      }).pipe(Effect.provide(context.layers)),
      {
        DbError: (e) => {
          console.error('[DbError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
        },
        PolicyError: (e) => {
          console.error('[PolicyError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
        },
      },
    );
  }),

  get: protectedProcedure.podcasts.get.handler(async ({ context, input, errors }) => {
    return handleEffect(
      Effect.gen(function* () {
        const podcasts = yield* Podcasts;
        const result = yield* podcasts.findById(input.id);
        return serializePodcastFull(result);
      }).pipe(Effect.provide(context.layers)),
      {
        PodcastNotFound: (e) => {
          throw errors.PODCAST_NOT_FOUND({
            message: e.message ?? `Podcast ${e.id} not found`,
            data: { podcastId: e.id },
          });
        },
        DbError: (e) => {
          console.error('[DbError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
        },
        PolicyError: (e) => {
          console.error('[PolicyError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
        },
        ForbiddenError: (e) => {
          throw errors.FORBIDDEN({ message: e.message });
        },
      },
    );
  }),

  create: protectedProcedure.podcasts.create.handler(async ({ context, input, errors }) => {
    return handleEffect(
      Effect.gen(function* () {
        const podcasts = yield* Podcasts;
        const result = yield* podcasts.create(input);
        // Return full podcast shape with script (null for new podcasts)
        return serializePodcastFull({ ...result, script: null });
      }).pipe(Effect.provide(context.layers)),
      {
        DocumentNotFound: (e) => {
          throw errors.DOCUMENT_NOT_FOUND({
            message: e.message ?? `Document ${e.id} not found or access denied`,
            data: { documentId: e.id },
          });
        },
        DbError: (e) => {
          console.error('[DbError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
        },
        PolicyError: (e) => {
          console.error('[PolicyError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
        },
        ForbiddenError: (e) => {
          throw errors.FORBIDDEN({ message: e.message });
        },
      },
    );
  }),

  update: protectedProcedure.podcasts.update.handler(async ({ context, input, errors }) => {
    const { id, ...data } = input;

    return handleEffect(
      Effect.gen(function* () {
        const podcasts = yield* Podcasts;
        const result = yield* podcasts.update(id, data);
        return serializePodcast(result);
      }).pipe(Effect.provide(context.layers)),
      {
        PodcastNotFound: (e) => {
          throw errors.PODCAST_NOT_FOUND({
            message: e.message ?? `Podcast ${e.id} not found`,
            data: { podcastId: e.id },
          });
        },
        DbError: (e) => {
          console.error('[DbError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
        },
        PolicyError: (e) => {
          console.error('[PolicyError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
        },
        ForbiddenError: (e) => {
          throw errors.FORBIDDEN({ message: e.message });
        },
      },
    );
  }),

  delete: protectedProcedure.podcasts.delete.handler(async ({ context, input, errors }) => {
    return handleEffect(
      Effect.gen(function* () {
        const podcasts = yield* Podcasts;
        yield* podcasts.delete(input.id);
        return {};
      }).pipe(Effect.provide(context.layers)),
      {
        PodcastNotFound: (e) => {
          throw errors.PODCAST_NOT_FOUND({
            message: e.message ?? `Podcast ${e.id} not found`,
            data: { podcastId: e.id },
          });
        },
        DbError: (e) => {
          console.error('[DbError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
        },
        PolicyError: (e) => {
          console.error('[PolicyError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
        },
        ForbiddenError: (e) => {
          throw errors.FORBIDDEN({ message: e.message });
        },
      },
    );
  }),

  getScript: protectedProcedure.podcasts.getScript.handler(async ({ context, input, errors }) => {
    return handleEffect(
      Effect.gen(function* () {
        const podcasts = yield* Podcasts;
        const result = yield* podcasts.getScript(input.id);
        return serializeScript(result);
      }).pipe(Effect.provide(context.layers)),
      {
        PodcastNotFound: (e) => {
          throw errors.PODCAST_NOT_FOUND({
            message: e.message ?? `Podcast ${e.id} not found`,
            data: { podcastId: e.id },
          });
        },
        ScriptNotFound: (e) => {
          throw errors.SCRIPT_NOT_FOUND({
            message: e.message ?? 'Script not found',
            data: { podcastId: e.podcastId },
          });
        },
        DbError: (e) => {
          console.error('[DbError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
        },
        PolicyError: (e) => {
          console.error('[PolicyError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
        },
        ForbiddenError: (e) => {
          throw errors.FORBIDDEN({ message: e.message });
        },
      },
    );
  }),

  updateScript: protectedProcedure.podcasts.updateScript.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const result = yield* podcasts.updateScript(id, data);
          return serializeScript(result);
        }).pipe(Effect.provide(context.layers)),
        {
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
          DbError: (e) => {
            console.error('[DbError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
          },
          PolicyError: (e) => {
            console.error('[PolicyError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
          },
          ForbiddenError: (e) => {
            throw errors.FORBIDDEN({ message: e.message });
          },
        },
      );
    },
  ),

  generate: protectedProcedure.podcasts.generate.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const queue = yield* Queue;
          const generator = yield* PodcastGenerator;

          // Verify podcast exists and user has access
          const podcast = yield* podcasts.findById(input.id);

          // Enqueue the combined generation job
          const payload: GeneratePodcastPayload = {
            podcastId: podcast.id,
            userId: podcast.createdBy,
            promptInstructions: input.promptInstructions,
          };

          const job = yield* queue.enqueue('generate-podcast', payload, podcast.createdBy);

          // Fire-and-forget: trigger immediate processing instead of waiting for worker poll
          yield* Effect.fork(
            queue.processNextJob('generate-podcast', (j: Job) => {
              const jobPayload = j.payload as GeneratePodcastPayload;
              return generator
                .generate(jobPayload.podcastId, {
                  promptInstructions: jobPayload.promptInstructions,
                })
                .pipe(
                  Effect.asVoid,
                  Effect.mapError(
                    (err) =>
                      new JobProcessingError({
                        jobId: j.id,
                        message: err.message,
                        cause: err,
                      }),
                  ),
                );
            }),
          );

          return {
            jobId: job.id,
            status: job.status,
          };
        }).pipe(
          Effect.withSpan('api.podcasts.generate', {
            attributes: { 'podcast.id': input.id },
          }),
          Effect.provide(context.layers),
        ),
        {
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
          DbError: (e) => {
            console.error('[DbError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
          },
          PolicyError: (e) => {
            console.error('[PolicyError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
          },
          ForbiddenError: (e) => {
            throw errors.FORBIDDEN({ message: e.message });
          },
          QueueError: (e) => {
            console.error('[QueueError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({ message: 'Failed to queue podcast generation' });
          },
        },
      );
    },
  ),

  getJob: protectedProcedure.podcasts.getJob.handler(async ({ context, input, errors }) => {
    return handleEffect(
      Effect.gen(function* () {
        const queue = yield* Queue;
        const job = yield* queue.getJob(input.jobId);
        return serializeJob(job);
      }).pipe(
        Effect.withSpan('api.podcasts.getJob', {
          attributes: { 'job.id': input.jobId },
        }),
        Effect.provide(context.layers),
      ),
      {
        QueueError: (e) => {
          console.error('[QueueError]', e.message, e.cause);
          throw errors.INTERNAL_ERROR({ message: 'Failed to fetch job status' });
        },
        JobNotFoundError: (e) => {
          throw errors.JOB_NOT_FOUND({
            message: e.message ?? `Job ${e.jobId} not found`,
            data: { jobId: e.jobId },
          });
        },
      },
    );
  }),
};

export default podcastRouter;
