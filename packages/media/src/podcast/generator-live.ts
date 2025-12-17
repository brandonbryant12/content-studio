import { CurrentUser, requireOwnership } from '@repo/auth-policy';
import { Documents } from '../document';
import { Db } from '@repo/effect/db';
import { LLM } from '@repo/ai/llm';
import { Storage } from '@repo/storage';
import { TTS, type SpeakerTurn, type SpeakerVoiceConfig } from '@repo/ai/tts';
import { Context, Effect, Layer, Schema } from 'effect';
import { PodcastGenerator, type PodcastGeneratorService } from './generator';
import { buildSystemPrompt, buildUserPrompt } from './prompts';
import * as Repo from './repository';

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

/**
 * Live layer for podcast generator service.
 *
 * Uses Layer.effect to capture all dependencies at the type level.
 * This ensures compile-time verification that all required services are available.
 *
 * Requires:
 * - Db: Database connection
 * - CurrentUser: Authenticated user context
 * - Documents: Document content service
 * - LLM: Language model for script generation
 * - TTS: Text-to-speech for audio synthesis
 * - Storage: File storage for audio upload
 */
export const PodcastGeneratorLive: Layer.Layer<
  PodcastGenerator,
  never,
  Db | CurrentUser | Documents | LLM | TTS | Storage
> = Layer.effect(
  PodcastGenerator,
  Effect.gen(function* () {
    // Capture all dependencies at layer construction time
    // These are now available in the closure for all service methods
    const db = yield* Db;
    const currentUser = yield* CurrentUser;
    const llm = yield* LLM;
    const docs = yield* Documents;
    const tts = yield* TTS;
    const storage = yield* Storage;

    // Create a context with Db and CurrentUser for repository operations
    const repoContext = Context.make(Db, db).pipe(
      Context.add(CurrentUser, currentUser),
    );

    // Create a full context including Storage for document operations
    const fullContext = Context.make(Db, db).pipe(
      Context.add(CurrentUser, currentUser),
      Context.add(Storage, storage),
    );

    // ============================================
    // Helper: Phase 1 - Generate Script
    // ============================================
    const runPhase1Script = (
      podcastId: string,
      options?: { promptInstructions?: string },
    ) =>
      Effect.gen(function* () {
        // 1. Load podcast and verify ownership
        const podcast = yield* Repo.findPodcastById(podcastId).pipe(
          Effect.provide(repoContext),
        );
        yield* requireOwnership(podcast.createdBy).pipe(
          Effect.provide(repoContext),
        );

        // 2. Update status to generating script
        yield* Repo.updatePodcastStatus(podcastId, 'generating_script').pipe(
          Effect.provide(repoContext),
        );

        // 3. Fetch all document content
        const documentContents = yield* Effect.all(
          podcast.documents.map((doc) =>
            docs.getContent(doc.id).pipe(Effect.provide(fullContext)),
          ),
        );
        const combinedContent = documentContents.join('\n\n---\n\n');

        // 4. Build prompts based on format
        const systemPrompt = buildSystemPrompt(
          podcast.format,
          options?.promptInstructions,
        );
        const userPrompt = buildUserPrompt(podcast, combinedContent);

        // 5. Generate script via LLM
        const llmResult = yield* llm.generate({
          system: systemPrompt,
          prompt: userPrompt,
          schema: ScriptOutputSchema,
          temperature: 0.7,
        });

        // 6. Add index to segments
        const segments = llmResult.object.segments.map(
          (s: { speaker: string; line: string }, i: number) => ({
            ...s,
            index: i,
          }),
        );

        // 7. Store script with summary and FULL generation prompt
        const fullGenerationPrompt = `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
        yield* Repo.upsertScript(
          podcastId,
          { segments },
          llmResult.object.summary,
          fullGenerationPrompt,
        ).pipe(Effect.provide(repoContext));

        // 7b. Store generation context for reproducibility
        yield* Repo.updatePodcastGenerationContext(podcastId, {
          systemPromptTemplate: systemPrompt,
          userInstructions: options?.promptInstructions ?? '',
          sourceDocuments: podcast.documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
          })),
          modelId: 'gemini-2.0-flash',
          modelParams: { temperature: 0.7 },
          generatedAt: new Date().toISOString(),
        }).pipe(Effect.provide(repoContext));

        // 8. Update podcast with generated metadata and status
        yield* Repo.updatePodcast(podcastId, {
          title: llmResult.object.title,
          description: llmResult.object.description,
          tags: [...llmResult.object.tags],
        }).pipe(Effect.provide(repoContext));
        yield* Repo.updatePodcastStatus(podcastId, 'script_ready').pipe(
          Effect.provide(repoContext),
        );

        return segments;
      });

    // ============================================
    // Helper: Phase 2 - Generate Audio
    // ============================================
    const runPhase2Audio = (podcastId: string) =>
      Effect.gen(function* () {
        // 1. Load podcast and verify ownership
        const podcast = yield* Repo.findPodcastById(podcastId).pipe(
          Effect.provide(repoContext),
        );
        yield* requireOwnership(podcast.createdBy).pipe(
          Effect.provide(repoContext),
        );

        // 2. Load script segments
        const script = yield* Repo.getActiveScript(podcastId).pipe(
          Effect.provide(repoContext),
        );

        // 3. Update status to generating audio
        yield* Repo.updatePodcastStatus(podcastId, 'generating_audio').pipe(
          Effect.provide(repoContext),
        );

        // 4. Convert segments to TTS turns
        const turns: SpeakerTurn[] = script.segments.map((s) => ({
          speaker: s.speaker,
          text: s.line,
        }));

        // 5. Build voice configs
        const voiceConfigs: SpeakerVoiceConfig[] = [
          { speakerAlias: 'host', voiceId: podcast.hostVoice ?? 'Charon' },
          { speakerAlias: 'cohost', voiceId: podcast.coHostVoice ?? 'Kore' },
        ];

        // 6. Synthesize audio
        const ttsResult = yield* tts.synthesize({
          turns,
          voiceConfigs,
        });

        // 7. Upload to storage
        const audioKey = `podcasts/${podcastId}/audio.wav`;
        yield* storage.upload(audioKey, ttsResult.audioContent, 'audio/wav');
        const audioUrl = yield* storage.getUrl(audioKey);

        // 8. Estimate duration (WAV 24kHz 16-bit mono = 48KB/sec)
        const duration = Math.round(ttsResult.audioContent.length / 48000);

        // 9. Update podcast with audio details and final status
        yield* Repo.updatePodcastAudio(podcastId, {
          audioUrl,
          duration,
          status: 'ready',
        }).pipe(Effect.provide(repoContext));
      });

    // ============================================
    // Service Implementation
    // ============================================
    const service: PodcastGeneratorService = {
      // Full generation (script + audio)
      generate: (podcastId, options) =>
        Effect.gen(function* () {
          // Phase 1: Generate script
          yield* runPhase1Script(podcastId, options);

          // Phase 2: Generate audio
          yield* runPhase2Audio(podcastId);

          // Return full podcast
          return yield* Repo.findPodcastById(podcastId).pipe(
            Effect.provide(repoContext),
          );
        }).pipe(
          Effect.withSpan('podcastGenerator.generate', {
            attributes: { 'podcast.id': podcastId },
          }),
        ),

      // Script-only generation (Phase 1)
      generateScript: (podcastId, options) =>
        Effect.gen(function* () {
          yield* runPhase1Script(podcastId, options);

          // Return full podcast (with script, no audio)
          return yield* Repo.findPodcastById(podcastId).pipe(
            Effect.provide(repoContext),
          );
        }).pipe(
          Effect.withSpan('podcastGenerator.generateScript', {
            attributes: { 'podcast.id': podcastId },
          }),
        ),

      // Audio-only generation (Phase 2)
      generateAudio: (podcastId) =>
        Effect.gen(function* () {
          yield* runPhase2Audio(podcastId);

          // Return full podcast
          return yield* Repo.findPodcastById(podcastId).pipe(
            Effect.provide(repoContext),
          );
        }).pipe(
          Effect.withSpan('podcastGenerator.generateAudio', {
            attributes: { 'podcast.id': podcastId },
          }),
        ),
    };

    return service;
  }),
);
