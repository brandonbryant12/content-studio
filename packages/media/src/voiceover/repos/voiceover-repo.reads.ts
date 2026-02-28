import { withDb, prepared } from '@repo/db/effect';
import { voiceover, type Voiceover } from '@repo/db/schema';
import { and, count as drizzleCount, desc, eq, sql } from 'drizzle-orm';
import { Effect } from 'effect';
import type { VoiceoverRepoService } from './voiceover-repo';
import { VoiceoverNotFound } from '../../errors';

const requireVoiceover = (id: string) =>
  Effect.flatMap((vo: Voiceover | null | undefined) =>
    vo ? Effect.succeed(vo) : Effect.fail(new VoiceoverNotFound({ id })),
  );

export const voiceoverReadMethods: Pick<
  VoiceoverRepoService,
  'findById' | 'findByIdForUser' | 'list' | 'count'
> = {
  findById: (id) =>
    withDb('voiceoverRepo.findById', (db) =>
      prepared(db, 'voiceoverRepo.findById', (db) =>
        db
          .select()
          .from(voiceover)
          .where(eq(voiceover.id, sql.placeholder('id')))
          .limit(1)
          .prepare('voiceoverRepo_findById'),
      )
        .execute({ id })
        .then((rows) => rows[0] ?? null),
    ).pipe(requireVoiceover(id)),

  findByIdForUser: (id, userId) =>
    withDb('voiceoverRepo.findByIdForUser', (db) =>
      prepared(db, 'voiceoverRepo.findByIdForUser', (db) =>
        db
          .select()
          .from(voiceover)
          .where(
            and(
              eq(voiceover.id, sql.placeholder('id')),
              eq(voiceover.createdBy, sql.placeholder('userId')),
            ),
          )
          .limit(1)
          .prepare('voiceoverRepo_findByIdForUser'),
      )
        .execute({ id, userId })
        .then((rows) => rows[0] ?? null),
    ).pipe(requireVoiceover(id)),

  list: (options) =>
    withDb('voiceoverRepo.list', (db) => {
      const createdBy = options.userId || options.createdBy;

      return db
        .select()
        .from(voiceover)
        .where(createdBy ? eq(voiceover.createdBy, createdBy) : undefined)
        .orderBy(desc(voiceover.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  count: (options) =>
    withDb('voiceoverRepo.count', async (db) => {
      const createdBy = options?.userId || options?.createdBy;

      const [result] = await db
        .select({ count: drizzleCount() })
        .from(voiceover)
        .where(createdBy ? eq(voiceover.createdBy, createdBy) : undefined);
      return result?.count ?? 0;
    }),
};
