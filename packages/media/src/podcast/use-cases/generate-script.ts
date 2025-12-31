import { Effect, Schema } from 'effect';
import type { PodcastScript } from '@repo/db/schema';
import type { Db, DatabaseError } from '@repo/db/effect';
import type { CurrentUser } from '@repo/auth-policy';
import {
  PodcastNotFound,
  DocumentNotFound,
  LLMError,
  LLMRateLimitError,
  ScriptNotFound,
  StorageError,
  StorageNotFoundError,
  DocumentParseError,
  PolicyError,
  ForbiddenError,
} from '@repo/db/errors';
import { LLM } from '@repo/ai/llm';
import { Storage } from '@repo/storage';
import { Documents } from '../../document';
import { PodcastRepo } from '../repos/podcast-repo';
import { ScriptVersionRepo, type VersionStatus } from '../repos/script-version-repo';
import { buildSystemPrompt, buildUserPrompt } from '../prompts';

// =============================================================================
// Types
// =============================================================================

export interface GenerateScriptInput {
  podcastId: string;
  versionId?: string; // If provided, update this version; otherwise create new
  promptInstructions?: string;
}

export interface GenerateScriptResult {
  version: PodcastScript;
  segmentCount: number;
}

export type GenerateScriptError =
  | PodcastNotFound
  | DocumentNotFound
  | ScriptNotFound
  | LLMError
  | LLMRateLimitError
  | StorageError
  | StorageNotFoundError
  | DocumentParseError
  | PolicyError
  | ForbiddenError
  | DatabaseError;

// =============================================================================
// Schema
// =============================================================================

/**
 * Schema for LLM output - includes podcast metadata and script segments.
 */
const ScriptOutputSchema = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  summary: Schema.String,
  tags: Schema.Array(Schema.String),
  segments: Schema.Array(
    Schema.Struct({
      speaker: Schema.String,
      line: Schema.String,
    }),
  ),
});

// =============================================================================
// Use Case
// =============================================================================

/**
 * Generate script content for a podcast version.
 *
 * This use case:
 * 1. Loads the podcast and its documents
 * 2. Creates or updates a version in 'drafting' status
 * 3. Sets status to 'generating_script'
 * 4. Fetches document content
 * 5. Calls LLM to generate script
 * 6. Updates version with script content and 'script_ready' status
 *
 * @example
 * const result = yield* generateScript({
 *   podcastId: 'podcast-123',
 *   promptInstructions: 'Make it conversational',
 * });
 */
export const generateScript = (
  input: GenerateScriptInput,
): Effect.Effect<
  GenerateScriptResult,
  GenerateScriptError,
  PodcastRepo | ScriptVersionRepo | Documents | LLM | Storage | Db | CurrentUser
> =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const scriptVersionRepo = yield* ScriptVersionRepo;
    const documents = yield* Documents;
    const llm = yield* LLM;

    // 1. Load podcast with documents
    const podcast = yield* podcastRepo.findByIdFull(input.podcastId);

    // 2. Get or create version
    let version: PodcastScript;

    if (input.versionId) {
      // Update existing version
      version = yield* scriptVersionRepo.findById(input.versionId);
    } else {
      // Create new version in drafting status
      version = yield* scriptVersionRepo.insert({
        podcastId: input.podcastId,
        status: 'drafting',
        segments: null,
      });
    }

    // 3. Set status to generating_script
    yield* scriptVersionRepo.updateStatus(version.id, 'generating_script');

    // 4. Fetch document content
    const documentContents = yield* Effect.all(
      podcast.documents.map((doc) => documents.getContent(doc.id)),
    );
    const combinedContent = documentContents.join('\n\n---\n\n');

    // 5. Build prompts
    const effectivePrompt = input.promptInstructions ?? podcast.promptInstructions ?? '';
    const systemPrompt = buildSystemPrompt(podcast.format, effectivePrompt);
    const userPrompt = buildUserPrompt(
      {
        title: podcast.title,
        description: podcast.description,
      },
      combinedContent,
    );

    // 6. Call LLM
    const llmResult = yield* llm.generate({
      system: systemPrompt,
      prompt: userPrompt,
      schema: ScriptOutputSchema,
      temperature: 0.7,
    });

    // 7. Process segments with indices
    const segments = llmResult.object.segments.map((s, i) => ({
      speaker: s.speaker,
      line: s.line,
      index: i,
    }));

    // 8. Build generation prompt for audit
    const generationPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;

    // 9. Update version with script content (script_ready status)
    const updatedVersion = yield* scriptVersionRepo.update(version.id, {
      status: 'script_ready' as VersionStatus,
      segments,
      summary: llmResult.object.summary,
      generationPrompt,
    });

    // 10. Update podcast metadata from LLM output
    yield* podcastRepo.update(input.podcastId, {
      title: llmResult.object.title,
      description: llmResult.object.description,
      tags: [...llmResult.object.tags],
    });

    return {
      version: updatedVersion,
      segmentCount: segments.length,
    };
  }).pipe(
    Effect.withSpan('useCase.generateScript', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
