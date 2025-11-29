import { Podcasts, type PodcastFull } from '@repo/podcast';
import { JobProcessingError } from '@repo/queue';
import { Effect } from 'effect';
import type { CurrentUser } from '@repo/auth-policy';
import type { Documents } from '@repo/documents';
import type { Db } from '@repo/effect/db';
import type { LLM } from '@repo/llm';
import type { GeneratePodcastPayload, GeneratePodcastResult, Job } from '@repo/queue';
import type { Storage } from '@repo/storage';
import type { TTS } from '@repo/tts';

/** Context required for podcast generation handler */
type HandlerContext = Podcasts | Db | CurrentUser | TTS | Storage | Documents | LLM;

/**
 * Handler for generate-podcast jobs.
 * Calls the podcast service to generate script, synthesize audio, upload to storage, and update the record.
 *
 * Requires the following services in context:
 * - Podcasts: The podcast service
 * - Db: Database access
 * - CurrentUser: User context for authorization
 * - TTS: Text-to-speech service
 * - Storage: File storage service
 * - Documents: Document content service
 * - LLM: Language model service
 */
export const handleGeneratePodcast = (
  job: Job<GeneratePodcastPayload>,
): Effect.Effect<GeneratePodcastResult, JobProcessingError, HandlerContext> =>
  Effect.gen(function* () {
    const podcasts = yield* Podcasts;
    const { podcastId, promptInstructions } = job.payload;

    // Generate podcast (Script + Audio - all handled by the service)
    const podcast: PodcastFull = yield* podcasts.generate(podcastId, { promptInstructions });

    return {
      scriptId: podcast.script?.id ?? '',
      segmentCount: podcast.script?.segments.length ?? 0,
      audioUrl: podcast.audioUrl ?? '',
      duration: podcast.duration ?? 0,
    } satisfies GeneratePodcastResult;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const podcasts = yield* Podcasts;
        const { podcastId } = job.payload;

        // Try to mark podcast as failed
        yield* podcasts.setStatus(podcastId, 'failed', String(error)).pipe(
          Effect.catchAll(() => Effect.void), // Ignore errors updating status
        );

        return yield* Effect.fail(
          new JobProcessingError({
            jobId: job.id,
            message: `Failed to generate podcast: ${error instanceof Error ? error.message : String(error)}`,
            cause: error,
          }),
        );
      }),
    ),
    Effect.withSpan('worker.handleGeneratePodcast', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'podcast.id': job.payload.podcastId,
      },
    }),
  );
