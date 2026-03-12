import { GoogleGenAI } from '@google/genai';
import { Effect, Layer, Schedule } from 'effect';
import type { JsonValue } from '@repo/db/schema';
import { ResearchError } from '../../errors';
import {
  GoogleApiError,
  getGoogleApiErrorDetails,
  isGoogleRateLimit,
} from '../../google/error-parser';
import { PROVIDER_TIMEOUTS_MS } from '../../provider-timeouts';
import { DEEP_RESEARCH_MODEL } from '../../providers/google/models';
import { recordAIUsageIfConfigured } from '../../usage';
import {
  DeepResearch,
  type DeepResearchService,
  type ResearchResult,
  type ResearchSource,
} from '../service';

/**
 * Configuration for Google Deep Research provider.
 */
export interface GoogleDeepResearchConfig {
  readonly apiKey: string;
}

/** A single typed content block from the interactions API. */
interface OutputBlock {
  type?: string;
  text?: string;
  annotations?: Array<{
    source?: string;
    start_index?: number;
    end_index?: number;
  }>;
  result?: Array<{ title?: string; url?: string; rendered_content?: string }>;
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_STATUS_NAMES = new Set([
  'RESOURCE_EXHAUSTED',
  'UNAVAILABLE',
  'DEADLINE_EXCEEDED',
  'INTERNAL',
  'ABORTED',
]);
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ECONNABORTED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const TRANSIENT_MESSAGE_TOKENS = [
  '429',
  '500',
  '502',
  '503',
  '504',
  'rate limit',
  'resource exhausted',
  'temporarily unavailable',
  'timeout',
  'timed out',
  'network',
  'socket hang up',
] as const;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getStringField(value: unknown, field: string): string | undefined {
  const record = asRecord(value);
  const maybeValue = record?.[field];
  return typeof maybeValue === 'string' ? maybeValue : undefined;
}

function getNumberField(value: unknown, field: string): number | undefined {
  const record = asRecord(value);
  const maybeValue = record?.[field];
  return typeof maybeValue === 'number' ? maybeValue : undefined;
}

function getObjectField(
  value: unknown,
  field: string,
): Record<string, unknown> | undefined {
  const record = asRecord(value);
  const maybeValue = record?.[field];
  if (typeof maybeValue !== 'object' || maybeValue === null) {
    return undefined;
  }

  return maybeValue as Record<string, unknown>;
}

function getBooleanField(value: unknown, field: string): boolean | undefined {
  const record = asRecord(value);
  const maybeValue = record?.[field];
  return typeof maybeValue === 'boolean' ? maybeValue : undefined;
}

function extractInteractionDiagnostics(interaction: unknown): {
  interactionId: string | undefined;
  status: string | undefined;
  done: boolean | undefined;
  createdAt: string | undefined;
  updatedAt: string | undefined;
  errorCode: string | undefined;
  errorStatus: string | undefined;
  errorMessage: string | undefined;
} {
  const primaryError =
    getObjectField(interaction, 'error') ??
    getObjectField(interaction, 'last_error') ??
    getObjectField(interaction, 'failure');

  return {
    interactionId:
      getStringField(interaction, 'id') ??
      getStringField(interaction, 'name'),
    status: getStringField(interaction, 'status'),
    done: getBooleanField(interaction, 'done'),
    createdAt:
      getStringField(interaction, 'createTime') ??
      getStringField(interaction, 'createdAt'),
    updatedAt:
      getStringField(interaction, 'updateTime') ??
      getStringField(interaction, 'updatedAt'),
    errorCode:
      getStringField(primaryError, 'code') ??
      getStringField(primaryError, 'reason'),
    errorStatus:
      getStringField(primaryError, 'status') ??
      getStringField(primaryError, 'type'),
    errorMessage:
      getStringField(primaryError, 'message') ??
      getStringField(interaction, 'errorMessage'),
  };
}

function extractResearchErrorDiagnostics(error: ResearchError): {
  message: string;
  googleStatus: string | undefined;
  googleCode: string | undefined;
  googleMessage: string | undefined;
  statusCode: number | undefined;
  causeCode: string | undefined;
} {
  const details = getGoogleApiErrorDetails(error.cause);
  const statusCode =
    error.cause instanceof GoogleApiError
      ? error.cause.statusCode
      : (getNumberField(error.cause, 'statusCode') ??
        getNumberField(error.cause, 'status'));

  return {
    message: error.message,
    googleStatus: details?.status,
    googleCode: details?.code !== undefined ? String(details.code) : undefined,
    googleMessage: details?.message,
    statusCode,
    causeCode: getStringField(error.cause, 'code'),
  };
}

function isTransientResearchCause(cause: unknown): boolean {
  const details = getGoogleApiErrorDetails(cause);
  const statusCode =
    cause instanceof GoogleApiError
      ? cause.statusCode
      : (getNumberField(cause, 'statusCode') ??
        getNumberField(cause, 'status'));

  if (
    (statusCode !== undefined && RETRYABLE_STATUS_CODES.has(statusCode)) ||
    isGoogleRateLimit(details, statusCode)
  ) {
    return true;
  }

  const statusName = (
    details?.status ?? getStringField(cause, 'status')
  )?.toUpperCase();
  if (statusName && RETRYABLE_STATUS_NAMES.has(statusName)) {
    return true;
  }

  const networkCode = getStringField(cause, 'code')?.toUpperCase();
  if (networkCode && RETRYABLE_NETWORK_CODES.has(networkCode)) {
    return true;
  }

  const message = (
    details?.message ??
    (cause instanceof Error ? cause.message : getStringField(cause, 'message'))
  )?.toLowerCase();
  if (!message) {
    return false;
  }

  return TRANSIENT_MESSAGE_TOKENS.some((token) => message.includes(token));
}

const retryTransientResearch = <A, R>(
  effect: Effect.Effect<A, ResearchError, R>,
): Effect.Effect<A, ResearchError, R> =>
  effect.pipe(
    Effect.retry({
      times: 2,
      schedule: Schedule.exponential('500 millis'),
      while: (error) => isTransientResearchCause(error.cause),
    }),
  );

/** Extract text content from typed content blocks. */
function extractContent(outputs: readonly OutputBlock[]): string {
  return outputs
    .filter(
      (b): b is OutputBlock & { text: string } => b.type === 'text' && !!b.text,
    )
    .map((b) => b.text)
    .join('\n\n');
}

/** Extract deduplicated sources from search result blocks and text annotations. */
function extractSources(outputs: readonly OutputBlock[]): ResearchSource[] {
  const sources: ResearchSource[] = [];
  const seenUrls = new Set<string>();

  const addSource = (url: string, title: string) => {
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      sources.push({ title, url });
    }
  };

  for (const block of outputs) {
    if (block.type === 'google_search_result' && block.result) {
      for (const result of block.result) {
        if (result.url) addSource(result.url, result.title ?? result.url);
      }
    }
    if (block.type === 'text' && block.annotations) {
      for (const annotation of block.annotations) {
        if (annotation.source) addSource(annotation.source, annotation.source);
      }
    }
  }

  return sources;
}

/**
 * Create Google Deep Research service implementation.
 */
const makeGoogleDeepResearchService = (
  config: GoogleDeepResearchConfig,
): DeepResearchService => {
  const genAI = new GoogleGenAI({ apiKey: config.apiKey });
  const modelId = DEEP_RESEARCH_MODEL;
  const compactJsonRecord = (
    record: Record<string, JsonValue | undefined>,
  ): Record<string, JsonValue> =>
    Object.fromEntries(
      Object.entries(record).filter(([, value]) => value !== undefined),
    ) as Record<string, JsonValue>;
  const provider = 'google' as const;
  const getResultUsageMetadata = (interactionId: string) => ({ interactionId });

  return {
    startResearch: (query: string) =>
      Effect.tryPromise({
        try: async () => {
          const interaction = await genAI.interactions.create(
            {
              agent: modelId,
              input: query,
              background: true,
              agent_config: {
                type: 'deep-research',
              },
            },
            {
              // Per-attempt timeout budget: Effect retry starts a fresh request.
              timeout: PROVIDER_TIMEOUTS_MS.deepResearchStart,
              maxRetries: 0,
              signal: AbortSignal.timeout(PROVIDER_TIMEOUTS_MS.deepResearchStart),
            },
          );

          return { interactionId: interaction.id };
        },
        catch: (error) =>
          new ResearchError({
            message:
              error instanceof Error ? error.message : 'Failed to start research',
            cause: error,
          }),
      }).pipe(
        Effect.tap((result) =>
          recordAIUsageIfConfigured({
            modality: 'deep_research',
            provider,
            providerOperation: 'startResearch',
            model: modelId,
            status: 'succeeded',
            providerResponseId: result.interactionId,
            usage: { researchRunCount: 1, queryChars: query.length },
            metadata: { queryChars: query.length },
          }),
        ),
        Effect.tapError((error) =>
          recordAIUsageIfConfigured({
            modality: 'deep_research',
            provider,
            providerOperation: 'startResearch',
            model: modelId,
            status: 'failed',
            errorTag: error._tag,
            usage: { researchRunCount: 1, queryChars: query.length },
            metadata: { queryChars: query.length },
          }),
        ),
        retryTransientResearch,
        Effect.tapError((error) =>
          Effect.logError({
            event: 'deepResearch.startResearch.failed',
            provider,
            diagnostics: extractResearchErrorDiagnostics(error),
          }),
        ),
        Effect.withSpan('deepResearch.startResearch', {
          attributes: {
            'research.provider': provider,
            'research.model': modelId,
          },
        }),
      ),

    getResult: (interactionId: string) =>
      Effect.gen(function* () {
        const interaction = yield* Effect.tryPromise({
          try: () =>
            genAI.interactions.get(
              interactionId,
              {},
              {
                // Per-attempt timeout budget: Effect retry starts a fresh request.
                timeout: PROVIDER_TIMEOUTS_MS.deepResearchGet,
                maxRetries: 0,
                signal: AbortSignal.timeout(
                  PROVIDER_TIMEOUTS_MS.deepResearchGet,
                ),
              },
            ),
          catch: (error) =>
            new ResearchError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to get research result',
              cause: error,
            }),
        }).pipe(
          Effect.tapError((error) =>
            recordAIUsageIfConfigured({
              modality: 'deep_research',
              provider,
              providerOperation: 'getResult',
              model: modelId,
              status: 'failed',
              errorTag: error._tag,
              providerResponseId: interactionId,
              metadata: getResultUsageMetadata(interactionId),
            }),
          ),
          retryTransientResearch,
          Effect.tapError((error) =>
            Effect.logError({
              event: 'deepResearch.getResult.failed',
              provider,
              interactionId,
              diagnostics: extractResearchErrorDiagnostics(error),
            }),
          ),
        );

        if (interaction.status === 'failed') {
          const diagnostics = extractInteractionDiagnostics(interaction);
          yield* recordAIUsageIfConfigured({
            modality: 'deep_research',
            provider,
            providerOperation: 'getResult',
            model: modelId,
            status: 'failed',
            errorTag:
              diagnostics.errorStatus ??
              diagnostics.errorCode ??
              'ResearchFailed',
            providerResponseId: diagnostics.interactionId ?? interactionId,
            metadata: compactJsonRecord({
              interactionId: diagnostics.interactionId ?? interactionId,
              interactionStatus: diagnostics.status,
              googleErrorCode: diagnostics.errorCode,
              googleErrorStatus: diagnostics.errorStatus,
            }),
          });
          yield* Effect.logError({
            event: 'deepResearch.interaction.failed',
            provider,
            interactionId,
            diagnostics,
          });
          return yield* new ResearchError({
            message: 'Research operation failed',
          });
        }

        if (interaction.status === 'cancelled') {
          const diagnostics = extractInteractionDiagnostics(interaction);
          yield* recordAIUsageIfConfigured({
            modality: 'deep_research',
            provider,
            providerOperation: 'getResult',
            model: modelId,
            status: 'aborted',
            providerResponseId: diagnostics.interactionId ?? interactionId,
            metadata: compactJsonRecord({
              interactionId: diagnostics.interactionId ?? interactionId,
              interactionStatus: diagnostics.status,
            }),
          });
          yield* Effect.logWarning({
            event: 'deepResearch.interaction.cancelled',
            provider,
            interactionId,
            diagnostics,
          });
          return yield* new ResearchError({
            message: 'Research operation was cancelled',
          });
        }

        if (
          interaction.status === 'in_progress' ||
          interaction.status === 'requires_action'
        ) {
          return null;
        }

        const outputs = (interaction.outputs ?? []) as OutputBlock[];
        const content = extractContent(outputs);
        const sources = extractSources(outputs);
        const wordCount = content
          .split(/\s+/)
          .filter((w) => w.length > 0).length;

        yield* recordAIUsageIfConfigured({
          modality: 'deep_research',
          provider,
          providerOperation: 'getResult',
          model: modelId,
          status: 'succeeded',
          providerResponseId: interactionId,
          usage: {
            outputWords: wordCount,
            sourceCount: sources.length,
          },
          metadata: compactJsonRecord({
            interactionId,
            interactionStatus: interaction.status,
          }),
        });

        return { content, sources, wordCount } satisfies ResearchResult;
      }).pipe(
        Effect.withSpan('deepResearch.getResult', {
          attributes: {
            'research.provider': provider,
            'research.model': modelId,
            'research.interactionId': interactionId,
          },
        }),
      ),
  };
};

/**
 * Create Google Deep Research service layer.
 *
 * @example
 * ```typescript
 * const DeepResearchLive = GoogleDeepResearchLive({ apiKey: env.GEMINI_API_KEY });
 *
 * const program = Effect.gen(function* () {
 *   const research = yield* DeepResearch;
 *   const { interactionId } = yield* research.startResearch('AI trends 2025');
 *   // ... poll getResult ...
 * }).pipe(Effect.provide(DeepResearchLive));
 * ```
 */
export const GoogleDeepResearchLive = (
  config: GoogleDeepResearchConfig,
): Layer.Layer<DeepResearch> =>
  Layer.sync(DeepResearch, () => makeGoogleDeepResearchService(config));
