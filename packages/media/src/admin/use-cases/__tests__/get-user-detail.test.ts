import { Db } from '@repo/db/effect';
import { generatePersonaId, type DbUser, type Persona } from '@repo/db/schema';
import {
  createTestAdmin,
  createTestInfographic,
  createTestPodcast,
  createTestSource,
  createTestUser,
  createTestVoiceover,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createMockInfographicRepo,
  createMockPersonaRepo,
  createMockPodcastRepo,
  createMockSourceRepo,
  createMockVoiceoverRepo,
} from '../../../test-utils/mock-repos';
import { AdminRepo, type AdminRepoService } from '../../repos/admin-repo';
import { getUserDetail } from '../get-user-detail';

const MockDbLive = Layer.succeed(Db, {
  db: {} as never,
});

const toDbUserRecord = (user: ReturnType<typeof createTestUser>): DbUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: true,
  image: null,
  role: user.role,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
});

const createMockAdminRepo = (
  overrides: Partial<AdminRepoService> = {},
): Layer.Layer<AdminRepo> =>
  Layer.succeed(AdminRepo, {
    searchUsers: () => Effect.die('not implemented'),
    listUserEntities: () => Effect.die('not implemented'),
    countUserEntities: () => Effect.die('not implemented'),
    findUserById: () => Effect.die('not implemented'),
    listUserAIUsageEvents: () => Effect.die('not implemented'),
    getUserAIUsageSummary: () => Effect.die('not implemented'),
    ...overrides,
  });

describe('getUserDetail', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns a full admin view of the target user', async () => {
    const admin = createTestAdmin({ id: 'admin-1' });
    const member = toDbUserRecord(createTestUser({ id: 'member-1' }));
    const source = createTestSource({
      createdBy: member.id,
      title: 'Source 1',
    });
    const podcast = createTestPodcast({
      createdBy: member.id,
      title: 'Podcast 1',
      sourceIds: [source.id],
    });
    const voiceover = createTestVoiceover({
      createdBy: member.id,
      title: 'Voiceover 1',
    });
    const infographic = createTestInfographic({
      createdBy: member.id,
      title: 'Infographic 1',
    });
    const persona: Persona = {
      id: generatePersonaId(),
      name: 'Host Persona',
      role: 'Analyst',
      personalityDescription: null,
      speakingStyle: null,
      exampleQuotes: null,
      voiceId: 'voice-1',
      voiceName: 'Charon',
      avatarStorageKey: null,
      createdBy: member.id,
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
      updatedAt: new Date('2026-03-02T10:00:00.000Z'),
    };

    const layers = Layer.mergeAll(
      MockDbLive,
      createMockAdminRepo({
        findUserById: () => Effect.succeed(member),
        listUserAIUsageEvents: () => Effect.succeed([]),
        getUserAIUsageSummary: () =>
          Effect.succeed({
            totalEvents: 0,
            totalEstimatedCostUsdMicros: 0,
            pricedEventCount: 0,
            byModality: [],
            byProvider: [],
            timeline: [],
          }),
      }),
      createMockSourceRepo({
        list: () => Effect.succeed([source]),
        count: () => Effect.succeed(1),
      }),
      createMockPodcastRepo({
        list: () => Effect.succeed([podcast]),
        count: () => Effect.succeed(1),
      }),
      createMockVoiceoverRepo({
        list: () => Effect.succeed([voiceover]),
        count: () => Effect.succeed(1),
      }),
      createMockPersonaRepo({
        list: () => Effect.succeed([persona]),
        count: () => Effect.succeed(1),
      }),
      createMockInfographicRepo({
        list: () => Effect.succeed([infographic]),
        count: () => Effect.succeed(1),
      }),
    );

    const result = await Effect.runPromise(
      withTestUser(admin)(
        getUserDetail({ userId: member.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result.user.id).toBe(member.id);
    expect(result.entityCounts).toEqual({
      sources: 1,
      podcasts: 1,
      voiceovers: 1,
      personas: 1,
      infographics: 1,
    });
    expect(result.recentEntities.sources[0]?.id).toBe(source.id);
    expect(result.recentEntities.podcasts[0]?.id).toBe(podcast.id);
    expect(result.recentEntities.voiceovers[0]?.id).toBe(voiceover.id);
    expect(result.recentEntities.personas[0]?.id).toBe(persona.id);
    expect(result.recentEntities.infographics[0]?.id).toBe(infographic.id);
    expect(result.aiUsageSummary.totalEvents).toBe(0);
  });

  it('fails with ForbiddenError for non-admin users', async () => {
    const user = createTestUser({ id: 'member-2' });
    const layers = Layer.mergeAll(
      MockDbLive,
      createMockAdminRepo(),
      createMockSourceRepo(),
      createMockPodcastRepo(),
      createMockVoiceoverRepo(),
      createMockPersonaRepo(),
      createMockInfographicRepo(),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        getUserDetail({ userId: 'member-1' }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('ForbiddenError');
    }
  });
});
