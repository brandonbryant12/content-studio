import { GoogleGenAI } from '@google/genai';
import { Effect, Layer } from 'effect';
import { ResearchError, ResearchTimeoutError } from '../../errors';
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

/**
 * Extract text content from interaction outputs.
 * The interactions API returns typed content blocks: { type: 'text', text: '...' }
 */
function extractContent(outputs: readonly OutputBlock[]): string {
  const parts: string[] = [];
  for (const block of outputs) {
    if (block.type === 'text' && block.text) {
      parts.push(block.text);
    }
  }
  return parts.join('\n\n');
}

/**
 * Extract grounding sources from interaction outputs.
 * Deep Research returns GoogleSearchResultContent blocks with search results,
 * and TextContent blocks with annotations referencing source URLs.
 */
function extractSources(outputs: readonly OutputBlock[]): ResearchSource[] {
  const sources: ResearchSource[] = [];
  const seenUrls = new Set<string>();

  // Extract from google_search_result blocks
  for (const block of outputs) {
    if (block.type === 'google_search_result' && block.result) {
      for (const result of block.result) {
        if (result.url && !seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          sources.push({
            title: result.title ?? result.url,
            url: result.url,
          });
        }
      }
    }
  }

  // Also extract from text annotations (citation sources)
  for (const block of outputs) {
    if (block.type === 'text' && block.annotations) {
      for (const annotation of block.annotations) {
        if (annotation.source && !seenUrls.has(annotation.source)) {
          seenUrls.add(annotation.source);
          sources.push({
            title: annotation.source,
            url: annotation.source,
          });
        }
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

  return {
    startResearch: (query: string) =>
      Effect.tryPromise({
        try: async () => {
          const interaction = await genAI.interactions.create({
            agent: 'deep-research-pro-preview-12-2025',
            input: query,
            background: true,
            agent_config: {
              type: 'deep-research',
            },
          });

          return { interactionId: interaction.id };
        },
        catch: (error) =>
          new ResearchError({
            message:
              error instanceof Error
                ? error.message
                : 'Failed to start research',
            cause: error,
          }),
      }).pipe(
        Effect.withSpan('deepResearch.startResearch', {
          attributes: { 'research.provider': 'google' },
        }),
      ),

    getResult: (interactionId: string) =>
      Effect.tryPromise({
        try: async () => {
          const interaction = await genAI.interactions.get(interactionId);

          if (interaction.status === 'failed') {
            throw new ResearchError({
              message: 'Research operation failed',
            });
          }

          if (interaction.status === 'cancelled') {
            throw new ResearchError({
              message: 'Research operation was cancelled',
            });
          }

          if (
            interaction.status === 'in_progress' ||
            interaction.status === 'requires_action'
          ) {
            return null;
          }

          // status === 'completed'
          const outputs = (interaction.outputs ?? []) as OutputBlock[];

          const content = extractContent(outputs);
          const sources = extractSources(outputs);
          const wordCount = content
            .split(/\s+/)
            .filter((w) => w.length > 0).length;

          return {
            content,
            sources,
            wordCount,
          } satisfies ResearchResult;
        },
        catch: (error) => {
          if (error instanceof ResearchError) return error;
          if (error instanceof ResearchTimeoutError) return error;
          return new ResearchError({
            message:
              error instanceof Error
                ? error.message
                : 'Failed to get research result',
            cause: error,
          });
        },
      }).pipe(
        Effect.withSpan('deepResearch.getResult', {
          attributes: {
            'research.provider': 'google',
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
