import { CurrentUser, requireOwnership, Role } from '@repo/auth-policy';
import { Documents } from '@repo/documents';
import { LLM } from '@repo/llm';
import { Storage } from '@repo/storage';
import { TTS, type SpeakerTurn, type SpeakerVoiceConfig } from '@repo/tts';
import { Effect, Layer, Schema } from 'effect';
import type { Db } from '@repo/effect/db';
import { PodcastNotFound } from './errors';
import { buildSystemPrompt, buildUserPrompt } from './prompts';
import * as Repo from './repository';
import { Podcasts, type PodcastService } from './service';

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
 * Live podcast service implementation.
 */
const makePodcastService: PodcastService = {
  create: (data) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const { documentIds, ...podcastData } = data;

      // Verify all documents exist and are owned by the user
      yield* Repo.verifyDocumentsExist(documentIds, user.id);

      // Create podcast with document links
      const result = yield* Repo.insertPodcast(
        {
          ...podcastData,
          createdBy: user.id,
        },
        documentIds,
      );

      return result;
    }).pipe(Effect.withSpan('podcasts.create')),

  findById: (id) =>
    Effect.gen(function* () {
      const podcast = yield* Repo.findPodcastById(id);
      yield* requireOwnership(podcast.createdBy);
      return podcast;
    }).pipe(
      Effect.withSpan('podcasts.findById', {
        attributes: { 'podcast.id': id },
      }),
    ),

  list: (options) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const isAdmin = user.role === Role.ADMIN;

      return yield* Repo.listPodcasts({
        createdBy: isAdmin ? undefined : user.id,
        status: options?.status,
        limit: options?.limit,
        offset: options?.offset,
      });
    }).pipe(Effect.withSpan('podcasts.list')),

  update: (id, data) =>
    Effect.gen(function* () {
      // Verify access
      const existing = yield* Repo.findPodcastById(id);
      yield* requireOwnership(existing.createdBy);

      return yield* Repo.updatePodcast(id, data);
    }).pipe(
      Effect.withSpan('podcasts.update', {
        attributes: { 'podcast.id': id },
      }),
    ),

  delete: (id) =>
    Effect.gen(function* () {
      const existing = yield* Repo.findPodcastById(id);
      yield* requireOwnership(existing.createdBy);

      const deleted = yield* Repo.deletePodcast(id);
      if (!deleted) {
        return yield* Effect.fail(new PodcastNotFound({ id }));
      }
    }).pipe(
      Effect.withSpan('podcasts.delete', {
        attributes: { 'podcast.id': id },
      }),
    ),

  getScript: (podcastId) =>
    Effect.gen(function* () {
      // Verify access to podcast first
      const existing = yield* Repo.findPodcastById(podcastId);
      yield* requireOwnership(existing.createdBy);

      return yield* Repo.getActiveScript(podcastId);
    }).pipe(
      Effect.withSpan('podcasts.getScript', {
        attributes: { 'podcast.id': podcastId },
      }),
    ),

  updateScript: (podcastId, data) =>
    Effect.gen(function* () {
      const existing = yield* Repo.findPodcastById(podcastId);
      yield* requireOwnership(existing.createdBy);

      return yield* Repo.upsertScript(podcastId, data);
    }).pipe(
      Effect.withSpan('podcasts.updateScript', {
        attributes: { 'podcast.id': podcastId },
      }),
    ),

  setStatus: (id, status, errorMessage) =>
    Repo.updatePodcastStatus(id, status, errorMessage).pipe(
      Effect.withSpan('podcasts.setStatus', {
        attributes: { 'podcast.id': id, 'podcast.status': status },
      }),
    ),

  count: (options) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const isAdmin = user.role === Role.ADMIN;

      return yield* Repo.countPodcasts({
        createdBy: isAdmin ? undefined : user.id,
        status: options?.status,
      });
    }).pipe(Effect.withSpan('podcasts.count')),

  generate: (podcastId, options) =>
    Effect.gen(function* () {
      const llm = yield* LLM;
      const docs = yield* Documents;
      const tts = yield* TTS;
      const storage = yield* Storage;

      // 1. Load podcast and verify ownership
      let podcast = yield* Repo.findPodcastById(podcastId);
      yield* requireOwnership(podcast.createdBy);

      // ============================================
      // PHASE 1: Generate Script
      // ============================================

      // 2. Update status to generating script
      yield* Repo.updatePodcastStatus(podcastId, 'generating_script');

      // 3. Fetch all document content (ordered by podcast_document.order)
      const documentContents = yield* Effect.all(
        podcast.documents.map((pd) => docs.getContent(pd.documentId)),
      );
      const combinedContent = documentContents.join('\n\n---\n\n');

      // 4. Build prompts based on format
      const systemPrompt = buildSystemPrompt(podcast.format, options?.promptInstructions);
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

      // 7. Store script with summary
      yield* Repo.upsertScript(
        podcastId,
        { segments },
        llmResult.object.summary,
        options?.promptInstructions,
      );

      // 8. Update podcast with generated metadata and status
      yield* Repo.updatePodcast(podcastId, {
        title: llmResult.object.title,
        description: llmResult.object.description,
        tags: [...llmResult.object.tags],
      });
      yield* Repo.updatePodcastStatus(podcastId, 'script_ready');

      // ============================================
      // PHASE 2: Generate Audio
      // ============================================

      // 9. Update status to generating audio
      yield* Repo.updatePodcastStatus(podcastId, 'generating_audio');

      // 10. Reload podcast to get updated voice settings
      podcast = yield* Repo.findPodcastById(podcastId);

      // 11. Convert segments to TTS turns
      const turns: SpeakerTurn[] = segments.map((s) => ({
        speaker: s.speaker,
        text: s.line,
      }));

      // 12. Build voice configs
      const voiceConfigs: SpeakerVoiceConfig[] = [
        { speakerAlias: 'host', voiceId: podcast.hostVoice ?? 'Charon' },
      ];
      if (podcast.format === 'conversation' && podcast.coHostVoice) {
        voiceConfigs.push({
          speakerAlias: 'co-host',
          voiceId: podcast.coHostVoice,
        });
      }

      // 13. Synthesize audio
      const ttsResult = yield* tts.synthesize({
        turns,
        voiceConfigs,
        audioEncoding: 'MP3',
      });

      // 14. Upload to storage
      const audioKey = `podcasts/${podcastId}/audio.mp3`;
      const audioUrl = yield* storage.upload(audioKey, ttsResult.audioContent, 'audio/mpeg');

      // 15. Estimate duration (~128kbps MP3 = 16KB/sec)
      const duration = Math.round(ttsResult.audioContent.length / 16000);

      // 16. Update podcast with audio details and final status
      yield* Repo.updatePodcastAudio(podcastId, {
        audioUrl,
        duration,
        status: 'ready',
      });

      // 17. Return full podcast for display
      return yield* Repo.findPodcastById(podcastId);
    }).pipe(
      Effect.withSpan('podcasts.generate', {
        attributes: { 'podcast.id': podcastId },
      }),
    ),
};

/**
 * Live layer for podcast service.
 *
 * Requires:
 * - Db: Database connection
 * - CurrentUser: Authenticated user context
 */
export const PodcastsLive: Layer.Layer<Podcasts, never, Db | CurrentUser> = Layer.succeed(
  Podcasts,
  makePodcastService,
);
