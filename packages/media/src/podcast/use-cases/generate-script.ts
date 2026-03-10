import { LLM } from '@repo/ai/llm';
import { getCurrentUser } from '@repo/auth/policy';
import { VersionStatus, type Podcast } from '@repo/db/schema';
import { Effect, Schema } from 'effect';
import { logActivity } from '../../activity';
import { loadPersonaByIdSafe } from '../../persona';
import {
  annotateUseCaseSpan,
  runBestEffortSideEffect,
  runSchemaContractWithRetries,
  withUseCaseSpan,
} from '../../shared';
import { getSourceContent } from '../../source';
import {
  buildSystemPrompt,
  buildUserPrompt,
  type PersonaContext,
  type ScriptPromptContext,
} from '../prompts';
import { PodcastRepo } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface GenerateScriptInput {
  podcastId: string;
  promptInstructions?: string;
  ignoreEpisodePlan?: boolean;
}

export interface GenerateScriptResult {
  podcast: Podcast;
  segmentCount: number;
}

// =============================================================================
// Schema
// =============================================================================

const ScriptOutputSchema = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  summary: Schema.String,
  tags: Schema.Array(Schema.String),
  segments: Schema.Array(
    Schema.Struct({
      speaker: Schema.String,
      line: Schema.String,
      startTimeMs: Schema.optional(
        Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
      ),
      endTimeMs: Schema.optional(
        Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
      ),
    }),
  ),
});

interface PersonaLike {
  name: string;
  role: string | null;
  personalityDescription: string | null;
  speakingStyle: string | null;
  exampleQuotes: string[] | null;
}

const toPersonaContext = (persona: PersonaLike): PersonaContext => ({
  name: persona.name,
  role: persona.role,
  personalityDescription: persona.personalityDescription,
  speakingStyle: persona.speakingStyle,
  exampleQuotes: persona.exampleQuotes ?? [],
});
const getErrorTag = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  '_tag' in error &&
  typeof error._tag === 'string'
    ? error._tag
    : 'UnknownError';
const loadPersonaContext = (personaId: string | null | undefined) =>
  personaId
    ? loadPersonaByIdSafe(personaId).pipe(
        Effect.map((persona) =>
          persona ? toPersonaContext(persona) : undefined,
        ),
      )
    : Effect.succeed<PersonaContext | undefined>(undefined);

// =============================================================================
// Use Case
// =============================================================================

export const generateScript = (input: GenerateScriptInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const podcastRepo = yield* PodcastRepo;
    const llm = yield* LLM;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    });
    const podcast = yield* podcastRepo.findByIdForUser(
      input.podcastId,
      user.id,
    );

    yield* podcastRepo.updateStatus(
      input.podcastId,
      VersionStatus.GENERATING_SCRIPT,
    );

    const [hostPersona, coHostPersona] = yield* Effect.all(
      [
        loadPersonaContext(podcast.hostPersonaId),
        loadPersonaContext(podcast.coHostPersonaId),
      ],
      { concurrency: 2 },
    );

    const sourceContents = yield* Effect.all(
      podcast.sources.map((doc) =>
        getSourceContent({ id: doc.id }).pipe(Effect.map((r) => r.content)),
      ),
      { concurrency: 'unbounded' },
    );
    const combinedContent = sourceContents.join('\n\n---\n\n');

    const effectivePrompt =
      input.promptInstructions ??
      (input.ignoreEpisodePlan ? '' : (podcast.promptInstructions ?? ''));
    const promptContext: ScriptPromptContext = {
      format: podcast.format,
      targetDurationMinutes: podcast.targetDurationMinutes,
      customInstructions: effectivePrompt,
      hostPersona,
      coHostPersona,
      episodePlan: input.ignoreEpisodePlan
        ? undefined
        : (podcast.episodePlan ?? undefined),
    };
    const systemPrompt = buildSystemPrompt(promptContext);
    const userPrompt = buildUserPrompt(
      {
        title: podcast.title,
        description: podcast.description,
        targetDurationMinutes: podcast.targetDurationMinutes,
      },
      combinedContent,
    );

    const llmResult = yield* runSchemaContractWithRetries({
      maxAttempts: 3,
      run: () =>
        llm.generate({
          system: systemPrompt,
          prompt: userPrompt,
          schema: ScriptOutputSchema,
          temperature: 0.7,
        }),
      onAttemptError: ({ attempt, maxAttempts, error, willRetry }) =>
        runBestEffortSideEffect(
          logActivity({
            userId: user.id,
            action: willRetry
              ? 'schema-validation-retry'
              : 'schema-validation-failed',
            entityType: 'podcast',
            entityId: podcast.id,
            entityTitle: podcast.title,
            metadata: {
              contract: 'podcast.script',
              attempt,
              maxAttempts,
              errorTag: getErrorTag(error),
            },
          }),
          {
            operation: 'podcast.schemaValidationActivityLog',
            attributes: {
              'podcast.id': podcast.id,
            },
          },
        ),
    });

    const segments = llmResult.object.segments.map((s, i) => ({
      speaker: s.speaker,
      line: s.line,
      index: i,
      startTimeMs: s.startTimeMs,
      endTimeMs: s.endTimeMs,
    }));

    yield* podcastRepo.updateScript(input.podcastId, {
      segments,
      summary: llmResult.object.summary,
      generationPrompt: `System: ${systemPrompt}\n\nUser: ${userPrompt}`,
    });
    yield* podcastRepo.updateStatus(
      input.podcastId,
      VersionStatus.SCRIPT_READY,
    );

    const updatedPodcast = yield* podcastRepo.update(input.podcastId, {
      title: llmResult.object.title,
      description: llmResult.object.description,
      tags: [...llmResult.object.tags],
    });

    return { podcast: updatedPodcast, segmentCount: segments.length };
  }).pipe(withUseCaseSpan('useCase.generateScript'));
