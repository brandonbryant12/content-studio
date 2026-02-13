import { LLM } from '@repo/ai/llm';
import { requireOwnership } from '@repo/auth/policy';
import { Effect, Schema } from 'effect';
import type { Podcast } from '@repo/db/schema';
import { getDocumentContent } from '../../document';
import { PersonaRepo } from '../../persona';
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
    }),
  ),
});

// =============================================================================
// Use Case
// =============================================================================

export const generateScript = (input: GenerateScriptInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const llm = yield* LLM;

    const podcast = yield* podcastRepo.findById(input.podcastId);
    yield* requireOwnership(podcast.createdBy);

    yield* podcastRepo.updateStatus(input.podcastId, 'generating_script');

    // Load personas if assigned
    let hostPersona: PersonaContext | undefined;
    let coHostPersona: PersonaContext | undefined;

    if (podcast.hostPersonaId) {
      const personaRepo = yield* PersonaRepo;
      const p = yield* personaRepo
        .findById(podcast.hostPersonaId)
        .pipe(Effect.catchTag('PersonaNotFound', () => Effect.succeed(null)));
      if (p) {
        hostPersona = {
          name: p.name,
          role: p.role,
          personalityDescription: p.personalityDescription,
          speakingStyle: p.speakingStyle,
          exampleQuotes: p.exampleQuotes ?? [],
        };
      }
    }

    if (podcast.coHostPersonaId) {
      const personaRepo = yield* PersonaRepo;
      const p = yield* personaRepo
        .findById(podcast.coHostPersonaId)
        .pipe(Effect.catchTag('PersonaNotFound', () => Effect.succeed(null)));
      if (p) {
        coHostPersona = {
          name: p.name,
          role: p.role,
          personalityDescription: p.personalityDescription,
          speakingStyle: p.speakingStyle,
          exampleQuotes: p.exampleQuotes ?? [],
        };
      }
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

    const llmResult = yield* llm.generate({
      system: systemPrompt,
      prompt: userPrompt,
      schema: ScriptOutputSchema,
      temperature: 0.7,
    });

    const segments = llmResult.object.segments.map((s, i) => ({
      speaker: s.speaker,
      line: s.line,
      index: i,
    }));

    yield* podcastRepo.updateScript(input.podcastId, {
      segments,
      summary: llmResult.object.summary,
      generationPrompt: `System: ${systemPrompt}\n\nUser: ${userPrompt}`,
    });
    yield* podcastRepo.updateStatus(input.podcastId, 'script_ready');

    const updatedPodcast = yield* podcastRepo.update(input.podcastId, {
      title: llmResult.object.title,
      description: llmResult.object.description,
      tags: [...llmResult.object.tags],
    });

    return { podcast: updatedPodcast, segmentCount: segments.length };
  }).pipe(
    Effect.withSpan('useCase.generateScript', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
