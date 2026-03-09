import {
  DeepResearch,
  LLM,
  sourceOutlineUserPrompt,
  renderPrompt,
} from '@repo/ai';
import {
  SourceOutlineSchema,
  SourceStatus,
  type ResearchConfig,
} from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { Effect, Schema } from 'effect';
import { logActivity } from '../../activity';
import { createPodcast } from '../../podcast/use-cases/create-podcast';
import { startGeneration } from '../../podcast/use-cases/start-generation';
import {
  annotateUseCaseSpan,
  formatUnknownError,
  runBestEffortSideEffect,
  runSchemaContractWithRetries,
  withUseCaseSpan,
} from '../../shared';
import { SourceRepo } from '../repos';
import { calculateContentHash } from '../services/content-utils';
import { ensureDeepResearchEnabled } from '../services/deep-research-feature';

export class ResearchTimeoutError extends Schema.TaggedError<ResearchTimeoutError>()(
  'ResearchTimeoutError',
  {
    sourceId: Schema.String,
    interactionId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 504 as const;
  static readonly httpCode = 'SOURCE_RESEARCH_TIMEOUT' as const;
  static readonly httpMessage = (e: ResearchTimeoutError) =>
    e.message ?? 'Source research timed out';
  static readonly logLevel = 'warn' as const;
  static getData(e: ResearchTimeoutError) {
    return { sourceId: e.sourceId, interactionId: e.interactionId };
  }
}

export class ResearchEmptyContentError extends Schema.TaggedError<ResearchEmptyContentError>()(
  'ResearchEmptyContentError',
  {
    sourceId: Schema.String,
    interactionId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 422 as const;
  static readonly httpCode = 'SOURCE_RESEARCH_EMPTY_CONTENT' as const;
  static readonly httpMessage = (e: ResearchEmptyContentError) =>
    e.message ?? 'Source research completed with no content';
  static readonly logLevel = 'warn' as const;
  static getData(e: ResearchEmptyContentError) {
    return { sourceId: e.sourceId, interactionId: e.interactionId };
  }
}

export interface ProcessResearchInput {
  sourceId: string;
  query: string;
}

/** Max total polling time: 60 minutes (Google's documented max for Deep Research) */
const MAX_POLL_DURATION_MS = 60 * 60 * 1000;

/** Backoff: 30s for first poll, then 60s thereafter */
const INITIAL_POLL_MS = 30_000;
const STEADY_POLL_MS = 60_000;
const getPollStatusLabel = <T>(result: T | null) =>
  result === null ? 'in_progress' : 'completed';
const getErrorTag = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  '_tag' in error &&
  typeof error._tag === 'string'
    ? error._tag
    : 'UnknownError';
const buildLatestResearchConfig = ({
  existing,
  query,
  autoGeneratePodcast,
}: {
  existing: ResearchConfig | null | undefined;
  query: string;
  autoGeneratePodcast: boolean;
}): ResearchConfig =>
  existing
    ? {
        ...existing,
        query,
        autoGeneratePodcast,
      }
    : {
        query,
        autoGeneratePodcast,
      };

export const processResearch = (input: ProcessResearchInput) => {
  let latestResearchConfig: ResearchConfig | null = null;

  return Effect.gen(function* () {
    const { sourceId, query } = input;
    yield* ensureDeepResearchEnabled;

    const research = yield* DeepResearch;
    const sourceRepo = yield* SourceRepo;
    const storage = yield* Storage;

    // 1. Check if we can resume an existing research operation for this source
    const doc = yield* sourceRepo.findById(sourceId);
    yield* annotateUseCaseSpan({
      userId: doc.createdBy,
      resourceId: sourceId,
      attributes: {
        'source.id': sourceId,
        'source.query': query,
      },
    });

    const resumableOperationId = doc.researchConfig?.operationId;
    const canResume =
      typeof resumableOperationId === 'string' &&
      doc.researchConfig?.researchStatus === 'in_progress';
    const autoGeneratePodcast =
      doc.researchConfig?.autoGeneratePodcast === true;
    latestResearchConfig = buildLatestResearchConfig({
      existing: doc.researchConfig,
      query,
      autoGeneratePodcast,
    });

    let interactionId: string;
    if (canResume) {
      interactionId = resumableOperationId;
      latestResearchConfig = {
        ...latestResearchConfig,
        operationId: interactionId,
        researchStatus: 'in_progress',
      };
      yield* Effect.logInfo(
        `Resuming polling for existing operation ${interactionId}`,
      );
    } else {
      // Start a new research operation
      const result = yield* research.startResearch(query);
      interactionId = result.interactionId;
      latestResearchConfig = {
        ...latestResearchConfig,
        operationId: interactionId,
        researchStatus: 'in_progress',
      };

      // Update source with interaction ID
      yield* sourceRepo.updateResearchConfig(sourceId, {
        query,
        operationId: interactionId,
        researchStatus: 'in_progress',
        autoGeneratePodcast,
      });
    }

    const markResearchFailed = (reason: string) =>
      Effect.gen(function* () {
        yield* sourceRepo.updateResearchConfig(sourceId, {
          query,
          operationId: interactionId,
          researchStatus: 'failed',
          autoGeneratePodcast,
        });
        yield* sourceRepo.updateStatus(sourceId, SourceStatus.FAILED, reason);
      });

    // 3. Poll for result: 30s first, then every 60s
    let elapsed = 0;
    let attempt = 1;
    let result = yield* research.getResult(interactionId);
    yield* Effect.logInfo(
      `Poll attempt ${attempt}: status=${getPollStatusLabel(result)} (elapsed: 0s)`,
    );

    while (result === null && elapsed < MAX_POLL_DURATION_MS) {
      const delay = elapsed === 0 ? INITIAL_POLL_MS : STEADY_POLL_MS;
      yield* Effect.sleep(delay);
      elapsed += delay;
      attempt += 1;
      result = yield* research.getResult(interactionId);
      yield* Effect.logInfo(
        `Poll attempt ${attempt}: status=${getPollStatusLabel(result)} (elapsed: ${Math.round(elapsed / 1000)}s)`,
      );
    }

    if (result === null) {
      yield* markResearchFailed('Research timed out after 60 minutes');
      return yield* new ResearchTimeoutError({ sourceId, interactionId });
    }

    if (!result.content.trim()) {
      yield* markResearchFailed('Research completed but returned no content');
      return yield* new ResearchEmptyContentError({
        sourceId,
        interactionId,
      });
    }

    yield* Effect.logInfo(
      `Research produced ${result.wordCount} words from ${result.sources.length} sources`,
    );

    const llm = yield* LLM;
    const outline = yield* runSchemaContractWithRetries({
      maxAttempts: 3,
      run: () =>
        llm.generate({
          prompt: renderPrompt(sourceOutlineUserPrompt, {
            query,
            content: result.content,
            sourceHints: result.sources.map((source) => source.url),
          }),
          schema: SourceOutlineSchema,
          temperature: 0.2,
        }),
      onAttemptError: ({ attempt, maxAttempts, error, willRetry }) =>
        runBestEffortSideEffect(
          logActivity({
            userId: doc.createdBy,
            action: willRetry
              ? 'schema-validation-retry'
              : 'schema-validation-failed',
            entityType: 'source',
            entityId: doc.id,
            entityTitle: doc.title,
            metadata: {
              contract: 'source.outline',
              attempt,
              maxAttempts,
              errorTag: getErrorTag(error),
            },
          }),
          {
            operation: 'source.schemaValidationActivityLog',
            attributes: {
              'source.id': doc.id,
            },
          },
        ),
    });

    // 4. Upload content to storage
    const contentKey = `sources/${sourceId}/content.txt`;
    yield* storage.upload(
      contentKey,
      Buffer.from(result.content, 'utf-8'),
      'text/plain',
    );

    // 5. Compute content hash
    const contentHash = yield* calculateContentHash(result.content);

    // 6. Update source content
    yield* sourceRepo.updateContent(sourceId, {
      contentKey,
      extractedText: result.content,
      contentHash,
      wordCount: result.wordCount,
    });

    // 7. Update research config with completion status + structured sources
    yield* sourceRepo.updateResearchConfig(sourceId, {
      query,
      operationId: interactionId,
      researchStatus: 'completed',
      sourceCount: result.sources.length,
      sources: result.sources.map((s) => ({ title: s.title, url: s.url })),
      outline: outline.object,
      autoGeneratePodcast,
    });

    // 8. Mark source as ready
    yield* sourceRepo.updateStatus(sourceId, SourceStatus.READY);

    if (autoGeneratePodcast) {
      yield* Effect.gen(function* () {
        const podcast = yield* createPodcast({
          title: `Podcast: ${doc.title}`,
          format: 'conversation',
          sourceIds: [doc.id],
          targetDurationMinutes: 5,
          hostVoice: 'Aoede',
          hostVoiceName: 'Aoede',
          coHostVoice: 'Charon',
          coHostVoiceName: 'Charon',
        });

        yield* startGeneration({ podcastId: podcast.id });
        yield* Effect.logInfo(
          `Auto-started podcast generation for source ${sourceId}`,
        );
      }).pipe(
        Effect.catchAll((error) =>
          Effect.logWarning(
            `Failed to auto-generate podcast for source ${sourceId}: ${formatUnknownError(error)}`,
          ),
        ),
      );
    }

    return { sourceId, wordCount: result.wordCount };
  }).pipe(
    Effect.catchIf(
      (
        error,
      ): error is Exclude<
        typeof error,
        ResearchTimeoutError | ResearchEmptyContentError
      > =>
        !(error instanceof ResearchTimeoutError) &&
        !(error instanceof ResearchEmptyContentError),
      (error) =>
        Effect.gen(function* () {
          const repo = yield* SourceRepo;
          if (latestResearchConfig) {
            yield* repo
              .updateResearchConfig(input.sourceId, {
                ...latestResearchConfig,
                researchStatus: 'failed',
              })
              .pipe(Effect.ignore);
          }

          yield* repo
            .updateStatus(
              input.sourceId,
              SourceStatus.FAILED,
              formatUnknownError(error),
            )
            .pipe(Effect.ignore);

          return yield* Effect.fail(error);
        }),
    ),
    withUseCaseSpan('useCase.processResearch'),
  );
};
