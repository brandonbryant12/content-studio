import { LLM } from '@repo/ai/llm';
import { getCurrentUser } from '@repo/auth/policy';
import { VersionStatus, type Podcast } from '@repo/db/schema';
import { Effect, Schema } from 'effect';
import { logActivity } from '../../activity';
import { getDocumentContent } from '../../document';
import { loadPersonaByIdSafe } from '../../persona';
import {
  annotateUseCaseSpan,
  runBestEffortSideEffect,
  runSchemaContractWithRetries,
  withUseCaseSpan,
} from '../../shared';
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

    // Load personas if assigned
    let hostPersona: PersonaContext | undefined;
    let coHostPersona: PersonaContext | undefined;

    const [hostPersonaResult, coHostPersonaResult] = yield* Effect.all(
      [
        podcast.hostPersonaId
          ? loadPersonaByIdSafe(podcast.hostPersonaId)
          : Effect.succeed(null),
        podcast.coHostPersonaId
          ? loadPersonaByIdSafe(podcast.coHostPersonaId)
          : Effect.succeed(null),
      ],
      { concurrency: 2 },
    );

    if (hostPersonaResult) {
      hostPersona = {
        name: hostPersonaResult.name,
        role: hostPersonaResult.role,
        personalityDescription: hostPersonaResult.personalityDescription,
        speakingStyle: hostPersonaResult.speakingStyle,
        exampleQuotes: hostPersonaResult.exampleQuotes ?? [],
      };
    }

    if (coHostPersonaResult) {
      coHostPersona = {
        name: coHostPersonaResult.name,
        role: coHostPersonaResult.role,
        personalityDescription: coHostPersonaResult.personalityDescription,
        speakingStyle: coHostPersonaResult.speakingStyle,
        exampleQuotes: coHostPersonaResult.exampleQuotes ?? [],
      };
    }

    const documentContents = yield* Effect.all(
      podcast.documents.map((doc) =>
        getDocumentContent({ id: doc.id }).pipe(Effect.map((r) => r.content)),
      ),
      { concurrency: 'unbounded' },
    );
    const combinedContent = documentContents.join('\n\n---\n\n');

    const effectivePrompt =
      input.promptInstructions ?? podcast.promptInstructions ?? '';
    const promptContext: ScriptPromptContext = {
      format: podcast.format,
      customInstructions: effectivePrompt,
      hostPersona,
      coHostPersona,
    };
    const systemPrompt = buildSystemPrompt(promptContext);
    const userPrompt = buildUserPrompt(
      { title: podcast.title, description: podcast.description },
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
              errorTag:
                typeof error === 'object' &&
                error !== null &&
                '_tag' in error &&
                typeof error._tag === 'string'
                  ? error._tag
                  : 'UnknownError',
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
