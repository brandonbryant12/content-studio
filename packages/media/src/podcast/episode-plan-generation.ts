import { LLM } from '@repo/ai/llm';
import {
  SourceStatus,
  PodcastEpisodePlanSchema,
  type PodcastEpisodePlan,
} from '@repo/db/schema';
import { Effect, Schema } from 'effect';
import type { PodcastWithSources } from './repos/podcast-repo';
import { loadPersonaByIdSafe } from '../persona';
import { getSourceContent } from '../source';
import { PODCAST_LLM_MODEL } from './constants';
import { sanitizePodcastEpisodePlan } from './episode-plan';
import { buildPlanSystemPrompt, buildPlanUserPrompt } from './prompts';
import { sanitizePodcastSetupInstructions } from './setup-instructions';

export class PodcastPlanSourcesNotReadyError extends Schema.TaggedError<PodcastPlanSourcesNotReadyError>()(
  'PodcastPlanSourcesNotReadyError',
  {
    podcastId: Schema.String,
    sourceIds: Schema.Array(Schema.String),
  },
) {
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'PODCAST_PLAN_SOURCES_NOT_READY' as const;
  static readonly httpMessage =
    'Selected sources must finish processing before a plan can be generated';
  static readonly logLevel = 'info' as const;

  static getData(error: PodcastPlanSourcesNotReadyError) {
    return {
      podcastId: error.podcastId,
      sourceIds: [...error.sourceIds],
    };
  }
}

const loadPersonaName = (personaId: string | null | undefined) =>
  personaId
    ? loadPersonaByIdSafe(personaId).pipe(
        Effect.map((persona) => persona?.name ?? undefined),
      )
    : Effect.succeed<string | undefined>(undefined);

export interface GenerateEpisodePlanOptions {
  podcast: PodcastWithSources;
  instructionsOverride?: string | null;
  fallbackInstructions?: string | null;
}

export const generateEpisodePlanForPodcast = ({
  podcast,
  instructionsOverride,
  fallbackInstructions,
}: GenerateEpisodePlanOptions) =>
  Effect.gen(function* () {
    const llm = yield* LLM;

    const pendingSourceIds = podcast.sources
      .filter((source) => source.status !== SourceStatus.READY)
      .map((source) => source.id);

    if (pendingSourceIds.length > 0) {
      return yield* Effect.fail(
        new PodcastPlanSourcesNotReadyError({
          podcastId: podcast.id,
          sourceIds: pendingSourceIds,
        }),
      );
    }

    const [hostPersonaName, coHostPersonaName, sourceEntries] =
      yield* Effect.all(
        [
          loadPersonaName(podcast.hostPersonaId),
          loadPersonaName(podcast.coHostPersonaId),
          Effect.all(
            podcast.sources.map((source) =>
              getSourceContent({ id: source.id }).pipe(
                Effect.map((result) => ({
                  id: source.id,
                  title: source.title,
                  content: result.content,
                })),
              ),
            ),
            { concurrency: 'unbounded' },
          ),
        ],
        { concurrency: 3 },
      );

    const { object } = yield* llm.generate({
      system: buildPlanSystemPrompt({
        format: podcast.format,
        targetDurationMinutes: podcast.targetDurationMinutes,
        hostPersonaName,
        coHostPersonaName,
      }),
      prompt: buildPlanUserPrompt({
        title: podcast.title,
        description: podcast.description,
        setupInstructions: sanitizePodcastSetupInstructions(
          instructionsOverride ??
            fallbackInstructions ??
            podcast.setupInstructions,
        ),
        sourceEntries,
      }),
      schema: PodcastEpisodePlanSchema,
      model: PODCAST_LLM_MODEL,
      temperature: 0.4,
    });

    const sanitizedPlan = sanitizePodcastEpisodePlan(object, {
      allowedSourceIds: podcast.sources.map((source) => source.id),
    });

    if (!sanitizedPlan) {
      return yield* Effect.die(
        'Expected generated podcast episode plan to survive sanitization',
      );
    }

    return sanitizedPlan satisfies PodcastEpisodePlan;
  });
