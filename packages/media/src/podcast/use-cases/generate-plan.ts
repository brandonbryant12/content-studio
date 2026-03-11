import { LLM } from '@repo/ai/llm';
import { SourceStatus, PodcastEpisodePlanSchema } from '@repo/db/schema';
import { Effect, Schema } from 'effect';
import { loadPersonaByIdSafe } from '../../persona';
import { defineAuthedUseCase } from '../../shared';
import { getSourceContent } from '../../source';
import { PODCAST_LLM_MODEL } from '../constants';
import { sanitizePodcastEpisodePlan } from '../episode-plan';
import { buildPlanSystemPrompt, buildPlanUserPrompt } from '../prompts';
import { PodcastRepo } from '../repos/podcast-repo';
import { sanitizePodcastSetupInstructions } from '../setup-instructions';

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

export interface GeneratePodcastPlanInput {
  podcastId: string;
}

const loadPersonaName = (personaId: string | null | undefined) =>
  personaId
    ? loadPersonaByIdSafe(personaId).pipe(
        Effect.map((persona) => persona?.name ?? undefined),
      )
    : Effect.succeed<string | undefined>(undefined);

export const generatePodcastPlan =
  defineAuthedUseCase<GeneratePodcastPlanInput>()({
    name: 'useCase.generatePodcastPlan',
    span: ({ input }) => ({
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    }),
    run: ({ input, user }) =>
      Effect.gen(function* () {
        const podcastRepo = yield* PodcastRepo;
        const llm = yield* LLM;

        const podcast = yield* podcastRepo.findByIdForUser(
          input.podcastId,
          user.id,
        );

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

        return yield* podcastRepo.update(podcast.id, {
          episodePlan: sanitizedPlan,
        });
      }),
  });
