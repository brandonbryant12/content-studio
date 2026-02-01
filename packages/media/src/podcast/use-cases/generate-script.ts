import { Effect, Schema } from 'effect';
import type { Podcast } from '@repo/db/schema';
import { LLM } from '@repo/ai/llm';
import { getDocumentContent } from '../../document';
import { BrandRepo } from '../../brand/repos';
import { PodcastRepo } from '../repos/podcast-repo';
import {
  buildSystemPrompt,
  buildUserPrompt,
  type PersonaContext,
  type SegmentContext,
  type ScriptPromptContext,
} from '../prompts';

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
// Helpers
// =============================================================================

/**
 * Convert a brand persona to prompt context.
 */
function toPersonaContext(
  persona: {
    name: string;
    role: string;
    personalityDescription: string;
    speakingStyle: string;
    exampleQuotes: string[];
  } | null,
): PersonaContext | null {
  if (!persona || !persona.name) return null;
  return {
    name: persona.name,
    role: persona.role || null,
    personalityDescription: persona.personalityDescription || null,
    speakingStyle: persona.speakingStyle || null,
    exampleQuotes: persona.exampleQuotes ?? [],
  };
}

/**
 * Convert a brand segment to prompt context.
 */
function toSegmentContext(
  segment: {
    name: string;
    description: string;
    messagingTone: string;
  } | null,
): SegmentContext | null {
  if (!segment || !segment.name) return null;
  return {
    name: segment.name,
    description: segment.description || null,
    messagingTone: segment.messagingTone || null,
  };
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Generate script content for a podcast.
 *
 * This use case:
 * 1. Loads the podcast and its documents
 * 2. Loads brand context (personas, segments) if brandId is set
 * 3. Sets status to 'generating_script'
 * 4. Fetches document content
 * 5. Calls LLM to generate script with persona/audience context
 * 6. Updates podcast with script content and 'script_ready' status
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
    const brandRepo = yield* BrandRepo;
    const llm = yield* LLM;

    // 1. Load podcast with documents
    const podcast = yield* podcastRepo.findByIdFull(input.podcastId);

    // 2. Load brand context if brandId is set
    let hostPersona: PersonaContext | null = null;
    let coHostPersona: PersonaContext | null = null;
    let targetSegment: SegmentContext | null = null;

    if (podcast.brandId) {
      const brand = yield* brandRepo
        .findById(podcast.brandId)
        .pipe(Effect.catchTag('BrandNotFound', () => Effect.succeed(null)));

      if (brand) {
        // Find host persona
        if (podcast.hostPersonaId && brand.personas) {
          const persona = brand.personas.find(
            (p) => p.id === podcast.hostPersonaId,
          );
          if (persona) {
            hostPersona = toPersonaContext(persona);
          }
        }

        // Find co-host persona (for conversation format)
        if (
          podcast.coHostPersonaId &&
          brand.personas &&
          podcast.format === 'conversation'
        ) {
          const persona = brand.personas.find(
            (p) => p.id === podcast.coHostPersonaId,
          );
          if (persona) {
            coHostPersona = toPersonaContext(persona);
          }
        }

        // Find target segment
        if (podcast.targetSegmentId && brand.segments) {
          const segment = brand.segments.find(
            (s) => s.id === podcast.targetSegmentId,
          );
          if (segment) {
            targetSegment = toSegmentContext(segment);
          }
        }
      }
    }

    // 3. Set status to generating_script
    yield* podcastRepo.updateStatus(input.podcastId, 'generating_script');

    // 4. Fetch document content using the use case
    const documentContents = yield* Effect.all(
      podcast.documents.map((doc) =>
        getDocumentContent({ id: doc.id }).pipe(Effect.map((r) => r.content)),
      ),
    );
    const combinedContent = documentContents.join('\n\n---\n\n');

    // 5. Build prompts with persona and audience context
    const effectivePrompt =
      input.promptInstructions ?? podcast.promptInstructions ?? '';

    const promptContext: ScriptPromptContext = {
      format: podcast.format,
      customInstructions: effectivePrompt || undefined,
      hostPersona,
      coHostPersona,
      targetSegment,
    };

    const systemPrompt = buildSystemPrompt(promptContext);
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

    // 9. Update podcast with script content (script_ready status)
    yield* podcastRepo.updateScript(input.podcastId, {
      segments,
      summary: llmResult.object.summary,
      generationPrompt,
    });
    yield* podcastRepo.updateStatus(input.podcastId, 'script_ready');

    // 10. Update podcast metadata from LLM output
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
