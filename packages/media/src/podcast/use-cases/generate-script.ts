import { Effect, Schema } from 'effect';
import type { Podcast } from '@repo/db/schema';
import { LLM } from '@repo/ai/llm';
import { getDocumentContent } from '../../document';
import { PodcastRepo } from '../repos/podcast-repo';
import { buildSystemPrompt, buildUserPrompt } from '../prompts';

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
 * Generate script content for a podcast.
 *
 * This use case:
 * 1. Loads the podcast and its documents
 * 2. Sets status to 'generating_script'
 * 3. Fetches document content
 * 4. Calls LLM to generate script
 * 5. Updates podcast with script content and 'script_ready' status
 *
 * @example
 * const result = yield* generateScript({
 *   podcastId: 'podcast-123',
 *   promptInstructions: 'Make it conversational',
 * });
 */
export const generateScript = (input: GenerateScriptInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const llm = yield* LLM;

    // 1. Load podcast with documents
    const podcast = yield* podcastRepo.findByIdFull(input.podcastId);

    // 2. Set status to generating_script
    yield* podcastRepo.updateStatus(input.podcastId, 'generating_script');

    // 3. Fetch document content using the use case
    const documentContents = yield* Effect.all(
      podcast.documents.map((doc) =>
        getDocumentContent({ id: doc.id }).pipe(Effect.map((r) => r.content)),
      ),
    );
    const combinedContent = documentContents.join('\n\n---\n\n');

    // 4. Build prompts
    const effectivePrompt =
      input.promptInstructions ?? podcast.promptInstructions ?? '';
    const systemPrompt = buildSystemPrompt(podcast.format, effectivePrompt);
    const userPrompt = buildUserPrompt(
      {
        title: podcast.title,
        description: podcast.description,
      },
      combinedContent,
    );

    // 5. Call LLM
    const llmResult = yield* llm.generate({
      system: systemPrompt,
      prompt: userPrompt,
      schema: ScriptOutputSchema,
      temperature: 0.7,
    });

    // 6. Process segments with indices
    const segments = llmResult.object.segments.map((s, i) => ({
      speaker: s.speaker,
      line: s.line,
      index: i,
    }));

    // 7. Build generation prompt for audit
    const generationPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;

    // 8. Update podcast with script content (script_ready status)
    yield* podcastRepo.updateScript(input.podcastId, {
      segments,
      summary: llmResult.object.summary,
      generationPrompt,
    });
    yield* podcastRepo.updateStatus(input.podcastId, 'script_ready');

    // 9. Update podcast metadata from LLM output
    const updatedPodcast = yield* podcastRepo.update(input.podcastId, {
      title: llmResult.object.title,
      description: llmResult.object.description,
      tags: [...llmResult.object.tags],
    });

    return {
      podcast: updatedPodcast,
      segmentCount: segments.length,
    };
  }).pipe(
    Effect.withSpan('useCase.generateScript', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
