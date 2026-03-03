import { withDb } from '@repo/db/effect';
import {
  voiceover,
  type Voiceover,
  type VoiceoverId,
  type VoiceoverStatus,
} from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
import type {
  UpdateAudioOptions,
  VoiceoverRepoService,
} from './voiceover-repo';
import { VoiceoverNotFound } from '../../errors';

const requireVoiceover = (id: string) =>
  Effect.flatMap((vo: Voiceover | null | undefined) =>
    vo ? Effect.succeed(vo) : Effect.fail(new VoiceoverNotFound({ id })),
  );

export const voiceoverWriteMethods: Pick<
  VoiceoverRepoService,
  | 'insert'
  | 'update'
  | 'delete'
  | 'updateStatus'
  | 'updateAudio'
  | 'clearAudio'
  | 'setApproval'
  | 'clearApproval'
> = {
  insert: (data) =>
    withDb('voiceoverRepo.insert', async (db) => {
      const [vo] = await db
        .insert(voiceover)
        .values({
          title: data.title,
          text: data.text,
          sourceDocumentId: data.sourceDocumentId,
          createdBy: data.createdBy,
        })
        .returning();
      return vo!;
    }),

  update: (id, data) =>
    withDb('voiceoverRepo.update', async (db) => {
      const updateValues: Partial<Voiceover> = {
        ...Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined),
        ),
        updatedAt: new Date(),
      };

      const [vo] = await db
        .update(voiceover)
        .set(updateValues)
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(requireVoiceover(id)),

  delete: (id) =>
    withDb('voiceoverRepo.delete', async (db) => {
      const result = await db
        .delete(voiceover)
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning({ id: voiceover.id });
      return result.length > 0;
    }),

  updateStatus: (id: string, status: VoiceoverStatus, errorMessage?: string) =>
    withDb('voiceoverRepo.updateStatus', async (db) => {
      const [vo] = await db
        .update(voiceover)
        .set({
          status,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        })
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(requireVoiceover(id)),

  updateAudio: (id: string, options: UpdateAudioOptions) =>
    withDb('voiceoverRepo.updateAudio', async (db) => {
      const [vo] = await db
        .update(voiceover)
        .set({
          audioUrl: options.audioUrl,
          duration: options.duration,
          updatedAt: new Date(),
        })
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(requireVoiceover(id)),

  clearAudio: (id) =>
    withDb('voiceoverRepo.clearAudio', async (db) => {
      const [vo] = await db
        .update(voiceover)
        .set({
          audioUrl: null,
          duration: null,
          updatedAt: new Date(),
        })
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(requireVoiceover(id)),

  setApproval: (id, approvedBy) =>
    withDb('voiceoverRepo.setApproval', async (db) => {
      const [vo] = await db
        .update(voiceover)
        .set({
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(requireVoiceover(id)),

  clearApproval: (id) =>
    withDb('voiceoverRepo.clearApproval', async (db) => {
      const [vo] = await db
        .update(voiceover)
        .set({
          approvedBy: null,
          approvedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(requireVoiceover(id)),
};
