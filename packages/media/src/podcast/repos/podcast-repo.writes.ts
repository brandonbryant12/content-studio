import { withDb } from '@repo/db/effect';
import {
  podcast,
  source,
  type Source,
  type SourceId,
  type Podcast,
  type PodcastId,
} from '@repo/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Effect } from 'effect';
import type {
  PodcastRepoService,
  PodcastWithSources,
  UpdateAudioOptions,
  UpdateScriptOptions,
} from './podcast-repo';
import { PodcastNotFound } from '../../errors';

const requirePodcast = <
  T extends Podcast | PodcastWithSources | null | undefined,
>(
  id: string,
) =>
  Effect.flatMap((pod: T) =>
    pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })),
  );

export const podcastWriteMethods: Pick<
  PodcastRepoService,
  | 'insert'
  | 'update'
  | 'delete'
  | 'updateGenerationContext'
  | 'updateStatus'
  | 'updateScript'
  | 'updateAudio'
  | 'clearAudio'
  | 'setApproval'
  | 'clearApproval'
> = {
  insert: (data, sourceIds) =>
    withDb('podcastRepo.insert', async (db) => {
      const resolvedSourceIds = [...sourceIds] as SourceId[];

      return db.transaction(async (tx) => {
        const [pod] = await tx
          .insert(podcast)
          .values({
            title: data.title ?? 'Generating...',
            description: data.description,
            format: data.format,
            promptInstructions: data.promptInstructions,
            targetDurationMinutes: data.targetDurationMinutes,
            hostVoice: data.hostVoice,
            hostVoiceName: data.hostVoiceName,
            coHostVoice: data.coHostVoice,
            coHostVoiceName: data.coHostVoiceName,
            sourceIds: resolvedSourceIds,
            createdBy: data.createdBy,
          })
          .returning();

        const docs =
          resolvedSourceIds.length > 0
            ? await tx
                .select()
                .from(source)
                .where(inArray(source.id, resolvedSourceIds))
            : [];

        const sourceMap = new Map(docs.map((d) => [d.id, d]));
        const sortedSources = resolvedSourceIds
          .map((id) => sourceMap.get(id))
          .filter((d): d is Source => d !== undefined);

        return { ...pod!, sources: sortedSources };
      });
    }),

  update: (id, data) =>
    withDb('podcastRepo.update', async (db) => {
      const { sourceIds, tags, ...rest } = data;
      const updateValues: Partial<Podcast> = {
        ...rest,
        updatedAt: new Date(),
      };

      if (sourceIds) {
        updateValues.sourceIds = [...sourceIds] as SourceId[];
      }
      if (tags) {
        updateValues.tags = [...tags];
      }

      const [pod] = await db
        .update(podcast)
        .set(updateValues)
        .where(eq(podcast.id, id as PodcastId))
        .returning();
      return pod;
    }).pipe(requirePodcast(id)),

  delete: (id) =>
    withDb('podcastRepo.delete', async (db) => {
      const result = await db
        .delete(podcast)
        .where(eq(podcast.id, id as PodcastId))
        .returning({ id: podcast.id });
      return result.length > 0;
    }),

  updateGenerationContext: (id, generationContext) =>
    withDb('podcastRepo.updateGenerationContext', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          generationContext,
          updatedAt: new Date(),
        })
        .where(eq(podcast.id, id as PodcastId))
        .returning();
      return pod;
    }).pipe(requirePodcast(id)),

  updateStatus: (id, status, errorMessage) =>
    withDb('podcastRepo.updateStatus', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          status,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        })
        .where(eq(podcast.id, id as PodcastId))
        .returning();
      return pod;
    }).pipe(requirePodcast(id)),

  updateScript: (id, options: UpdateScriptOptions) =>
    withDb('podcastRepo.updateScript', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          segments: options.segments,
          summary: options.summary,
          generationPrompt: options.generationPrompt,
          updatedAt: new Date(),
        })
        .where(eq(podcast.id, id as PodcastId))
        .returning();
      return pod;
    }).pipe(requirePodcast(id)),

  updateAudio: (id, options: UpdateAudioOptions) =>
    withDb('podcastRepo.updateAudio', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          audioUrl: options.audioUrl,
          duration: options.duration,
          updatedAt: new Date(),
        })
        .where(eq(podcast.id, id as PodcastId))
        .returning();
      return pod;
    }).pipe(requirePodcast(id)),

  clearAudio: (id) =>
    withDb('podcastRepo.clearAudio', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          audioUrl: null,
          duration: null,
          updatedAt: new Date(),
        })
        .where(eq(podcast.id, id as PodcastId))
        .returning();
      return pod;
    }).pipe(requirePodcast(id)),

  setApproval: (id, approvedBy) =>
    withDb('podcastRepo.setApproval', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(podcast.id, id as PodcastId))
        .returning();
      return pod;
    }).pipe(requirePodcast(id)),

  clearApproval: (id) =>
    withDb('podcastRepo.clearApproval', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          approvedBy: null,
          approvedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(podcast.id, id as PodcastId))
        .returning();
      return pod;
    }).pipe(requirePodcast(id)),
};
