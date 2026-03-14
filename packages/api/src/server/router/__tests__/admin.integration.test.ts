import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import {
  aiUsageEvent as aiUsageEventTable,
  generatePersonaId,
  infographic as infographicTable,
  persona as personaTable,
  podcast as podcastTable,
  source as sourceTable,
  user as userTable,
  voiceover as voiceoverTable,
  type InfographicId,
  type PodcastId,
  type SourceId,
  type UserOutput,
  type VoiceoverId,
} from '@repo/db/schema';
import { AdminRepoLive } from '@repo/media/admin';
import { InfographicRepoLive } from '@repo/media/infographic';
import { PersonaRepoLive } from '@repo/media/persona';
import { PodcastRepoLive } from '@repo/media/podcast';
import { SourceRepoLive } from '@repo/media/source';
import { VoiceoverRepoLive } from '@repo/media/voiceover';
import {
  createTestAdmin,
  createTestContext,
  createTestInfographic,
  createTestPodcast,
  createTestSource,
  createTestUser,
  createTestVoiceover,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import { Layer } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import {
  callORPCHandler,
  createMockContext,
  createMockErrors,
  createTestServerRuntime,
  expectHandlerErrorCode,
  expectIsoTimestamp,
} from '../_shared/test-helpers';
import adminRouter from '../admin';

type ORPCProcedure = {
  '~orpc': { handler: (args: unknown) => Promise<unknown> };
};

type HandlerArgs = { context: unknown; input: unknown; errors: unknown };

interface AdminUserEntitiesOutput {
  entities: Array<{
    entityType: 'source' | 'podcast' | 'voiceover' | 'persona' | 'infographic';
    entityId: string;
    title: string;
    subtitle: string | null;
    status: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  hasMore: boolean;
}

interface AdminUserDetailOutput {
  user: UserOutput;
  entityCounts: {
    sources: number;
    podcasts: number;
    voiceovers: number;
    personas: number;
    infographics: number;
  };
  recentEntities: {
    sources: Array<{ id: string; title: string }>;
    podcasts: Array<{ id: string; title: string }>;
    voiceovers: Array<{ id: string; title: string }>;
    personas: Array<{ id: string; name: string }>;
    infographics: Array<{ id: string; title: string }>;
  };
  aiUsageSummary: {
    totalEvents: number;
    totalEstimatedCostUsdMicros: number;
    pricedEventCount: number;
    byModality: Array<{
      modality: string;
      count: number;
      estimatedCostUsdMicros: number;
      pricedEventCount: number;
    }>;
    byProvider: Array<{
      provider: string;
      count: number;
      estimatedCostUsdMicros: number;
      pricedEventCount: number;
    }>;
    timeline: Array<{
      day: string;
      count: number;
      estimatedCostUsdMicros: number;
      pricedEventCount: number;
    }>;
  };
  aiUsageEvents: Array<{
    id: string;
    provider: string;
    providerOperation: string;
    modality: string;
    createdAt: string;
  }>;
}

const handlers = {
  search: (args: HandlerArgs): Promise<UserOutput[]> =>
    callORPCHandler<UserOutput[]>(
      adminRouter.users.search as unknown as ORPCProcedure,
      args,
    ),
  entities: (args: HandlerArgs): Promise<AdminUserEntitiesOutput> =>
    callORPCHandler<AdminUserEntitiesOutput>(
      adminRouter.users.entities as unknown as ORPCProcedure,
      args,
    ),
  get: (args: HandlerArgs): Promise<AdminUserDetailOutput> =>
    callORPCHandler<AdminUserDetailOutput>(
      adminRouter.users.get as unknown as ORPCProcedure,
      args,
    ),
};

const createTestRuntime = (ctx: TestContext): ServerRuntime => {
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));

  return createTestServerRuntime(
    Layer.mergeAll(
      ctx.dbLayer,
      policyLayer,
      AdminRepoLive,
      SourceRepoLive,
      PodcastRepoLive,
      VoiceoverRepoLive,
      PersonaRepoLive,
      InfographicRepoLive,
    ),
  );
};

const insertTestUser = async (
  ctx: TestContext,
  testUser: ReturnType<typeof createTestUser>,
) => {
  await ctx.db.insert(userTable).values({
    id: testUser.id,
    name: testUser.name,
    email: testUser.email,
    emailVerified: true,
    role: testUser.role,
  });
};

describe('admin router', () => {
  let ctx: TestContext;
  let runtime: ServerRuntime;
  let adminUser: ReturnType<typeof createTestAdmin>;
  let admin: User;
  const errors = createMockErrors();

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    runtime = createTestRuntime(ctx);
    adminUser = createTestAdmin({ id: 'admin-1', name: 'Admin User' });
    admin = toUser(adminUser);
    await insertTestUser(ctx, adminUser);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  it('returns FORBIDDEN for all admin-only handlers when user lacks admin role', async () => {
    const member = createTestUser({ id: 'member-1' });
    await insertTestUser(ctx, member);

    const context = createMockContext(runtime, toUser(member));
    const calls: Array<() => Promise<unknown>> = [
      () =>
        handlers.search({
          context,
          input: { query: 'alice' },
          errors,
        }),
      () =>
        handlers.get({
          context,
          input: { userId: member.id, usagePeriod: '30d' },
          errors,
        }),
      () =>
        handlers.entities({
          context,
          input: { userId: member.id, limit: 12, offset: 0 },
          errors,
        }),
    ];

    for (const call of calls) {
      await expectHandlerErrorCode(call, 'FORBIDDEN');
    }
  });

  describe('users.search handler', () => {
    it('returns serialized users filtered by name or email', async () => {
      const alice = createTestUser({
        id: 'user-1',
        name: 'Alice Admin Search',
        email: 'alice@example.com',
      });
      const bob = createTestUser({
        id: 'user-2',
        name: 'Bob Example',
        email: 'bob@example.com',
      });

      await insertTestUser(ctx, alice);
      await insertTestUser(ctx, bob);

      const result = await handlers.search({
        context: createMockContext(runtime, admin),
        input: { query: 'alice', limit: 10 },
        errors,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: alice.id,
        name: alice.name,
        email: alice.email,
      });
      expectIsoTimestamp(result[0]!.createdAt);
      expectIsoTimestamp(result[0]!.updatedAt);
    });
  });

  describe('users.get handler', () => {
    it('returns USER_NOT_FOUND when the target user does not exist', async () => {
      await expectHandlerErrorCode(
        () =>
          handlers.get({
            context: createMockContext(runtime, admin),
            input: { userId: 'missing-user', usagePeriod: '30d' },
            errors,
          }),
        'USER_NOT_FOUND',
      );
    });

    it('returns serialized user detail with entity counts and ai usage', async () => {
      const member = createTestUser({
        id: 'member-2',
        name: 'Usage Target',
        email: 'usage-target@example.com',
      });
      await insertTestUser(ctx, member);

      const source = createTestSource({
        createdBy: member.id,
        title: 'Quarterly Source',
      });
      const podcast = createTestPodcast({
        createdBy: member.id,
        title: 'Quarterly Podcast',
        sourceIds: [source.id],
        status: 'ready',
      });
      const voiceover = createTestVoiceover({
        createdBy: member.id,
        title: 'Narration Track',
        status: 'ready',
      });
      const infographic = createTestInfographic({
        createdBy: member.id,
        title: 'Quarterly Infographic',
        status: 'ready',
      });
      const personaId = generatePersonaId();

      await ctx.db.insert(sourceTable).values(source);
      await ctx.db.insert(podcastTable).values(podcast);
      await ctx.db.insert(voiceoverTable).values(voiceover);
      await ctx.db.insert(infographicTable).values(infographic);
      await ctx.db.insert(personaTable).values({
        id: personaId,
        name: 'Host Persona',
        role: 'Analyst',
        personalityDescription: null,
        speakingStyle: null,
        exampleQuotes: [],
        voiceId: 'voice-1',
        voiceName: 'Charon',
        avatarStorageKey: null,
        createdBy: member.id,
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-01T10:00:00.000Z'),
      });

      await ctx.db.insert(aiUsageEventTable).values([
        {
          userId: member.id,
          modality: 'llm',
          provider: 'google',
          providerOperation: 'generate-content',
          model: 'gemini-2.5-flash',
          status: 'succeeded',
          usage: { inputTokens: 1200, outputTokens: 300 },
          estimatedCostUsdMicros: 4200,
          createdAt: new Date('2026-03-04T12:00:00.000Z'),
        },
        {
          userId: member.id,
          modality: 'tts',
          provider: 'google',
          providerOperation: 'synthesize-speech',
          model: 'chirp-3',
          status: 'failed',
          errorTag: 'TTSQuotaExceededError',
          usage: { audioSeconds: 45 },
          estimatedCostUsdMicros: 1800,
          createdAt: new Date('2026-03-05T09:30:00.000Z'),
        },
      ]);

      const result = await handlers.get({
        context: createMockContext(runtime, admin),
        input: {
          userId: member.id,
          usagePeriod: '30d',
          entityLimit: 6,
          usageLimit: 10,
        },
        errors,
      });

      expect(result.user).toMatchObject({
        id: member.id,
        name: member.name,
        email: member.email,
      });
      expect(result.entityCounts).toEqual({
        sources: 1,
        podcasts: 1,
        voiceovers: 1,
        personas: 1,
        infographics: 1,
      });
      expect(result.recentEntities.sources[0]).toMatchObject({
        id: source.id,
        title: source.title,
      });
      expect(result.recentEntities.podcasts[0]).toMatchObject({
        id: podcast.id,
        title: podcast.title,
      });
      expect(result.recentEntities.voiceovers[0]).toMatchObject({
        id: voiceover.id,
        title: voiceover.title,
      });
      expect(result.recentEntities.personas[0]).toMatchObject({
        id: personaId,
        name: 'Host Persona',
      });
      expect(result.recentEntities.infographics[0]).toMatchObject({
        id: infographic.id,
        title: infographic.title,
      });
      expect(result.aiUsageSummary.totalEvents).toBe(2);
      expect(result.aiUsageSummary.totalEstimatedCostUsdMicros).toBe(6000);
      expect(result.aiUsageSummary.pricedEventCount).toBe(2);
      expect(result.aiUsageSummary.byModality).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            modality: 'llm',
            count: 1,
            pricedEventCount: 1,
          }),
          expect.objectContaining({
            modality: 'tts',
            count: 1,
            pricedEventCount: 1,
          }),
        ]),
      );
      expect(result.aiUsageSummary.byProvider).toEqual([
        expect.objectContaining({
          provider: 'google',
          count: 2,
          pricedEventCount: 2,
        }),
      ]);
      expect(result.aiUsageEvents).toHaveLength(2);
      expect(result.aiUsageEvents[0]).toMatchObject({
        provider: 'google',
      });
      expectIsoTimestamp(result.aiUsageEvents[0]!.createdAt);
    });

    it('marks usage as unpriced when events have no estimated costs', async () => {
      const member = createTestUser({
        id: 'member-3',
        name: 'Unpriced Usage',
        email: 'unpriced@example.com',
      });
      await insertTestUser(ctx, member);

      await ctx.db.insert(aiUsageEventTable).values([
        {
          userId: member.id,
          modality: 'llm',
          provider: 'google',
          providerOperation: 'generateObject',
          model: 'gemini-2.5-flash',
          status: 'succeeded',
          usage: { inputTokens: 900, outputTokens: 250 },
          createdAt: new Date('2026-03-04T12:00:00.000Z'),
        },
        {
          userId: member.id,
          modality: 'tts',
          provider: 'google',
          providerOperation: 'synthesize',
          model: 'gemini-2.5-flash-preview-tts',
          status: 'succeeded',
          usage: { inputChars: 1451 },
          createdAt: new Date('2026-03-05T09:30:00.000Z'),
        },
      ]);

      const result = await handlers.get({
        context: createMockContext(runtime, admin),
        input: {
          userId: member.id,
          usagePeriod: '30d',
        },
        errors,
      });

      expect(result.aiUsageSummary.totalEvents).toBe(2);
      expect(result.aiUsageSummary.totalEstimatedCostUsdMicros).toBe(0);
      expect(result.aiUsageSummary.pricedEventCount).toBe(0);
      expect(result.aiUsageSummary.byProvider).toEqual([
        expect.objectContaining({
          provider: 'google',
          count: 2,
          estimatedCostUsdMicros: 0,
          pricedEventCount: 0,
        }),
      ]);
      expect(result.aiUsageSummary.timeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            count: 1,
            estimatedCostUsdMicros: 0,
            pricedEventCount: 0,
          }),
        ]),
      );
    });
  });

  describe('users.entities handler', () => {
    it('returns paginated user entities filtered by search and type', async () => {
      const member = createTestUser({
        id: 'member-entities-2',
        name: 'Entity Target',
        email: 'entities@example.com',
      });
      await insertTestUser(ctx, member);

      const oldSource = createTestSource({
        id: 'doc_old_entity' as SourceId,
        createdBy: member.id,
        title: 'Alpha Source',
        updatedAt: new Date('2026-03-01T08:00:00.000Z'),
      });
      const recentPodcast = createTestPodcast({
        id: 'pod_recent_entity' as PodcastId,
        createdBy: member.id,
        title: 'Alpha Podcast',
        sourceIds: [],
        status: 'ready',
        updatedAt: new Date('2026-03-05T09:00:00.000Z'),
      });
      const recentVoiceover = createTestVoiceover({
        id: 'voc_recent_entity' as VoiceoverId,
        createdBy: member.id,
        title: 'Alpha Voiceover',
        status: 'failed',
        updatedAt: new Date('2026-03-04T09:00:00.000Z'),
      });
      const personaId = generatePersonaId();
      const infographic = createTestInfographic({
        id: 'inf_recent_entity' as InfographicId,
        createdBy: member.id,
        title: 'Quarterly Graphic',
        status: 'ready',
        updatedAt: new Date('2026-03-02T09:00:00.000Z'),
      });

      await ctx.db.insert(sourceTable).values(oldSource);
      await ctx.db.insert(podcastTable).values(recentPodcast);
      await ctx.db.insert(voiceoverTable).values(recentVoiceover);
      await ctx.db.insert(personaTable).values({
        id: personaId,
        name: 'Alpha Persona',
        role: 'Analyst',
        personalityDescription: null,
        speakingStyle: null,
        exampleQuotes: [],
        voiceId: 'voice-1',
        voiceName: 'Charon',
        avatarStorageKey: null,
        createdBy: member.id,
        createdAt: new Date('2026-03-03T10:00:00.000Z'),
        updatedAt: new Date('2026-03-03T10:00:00.000Z'),
      });
      await ctx.db.insert(infographicTable).values(infographic);

      const firstPage = await handlers.entities({
        context: createMockContext(runtime, admin),
        input: {
          userId: member.id,
          query: 'alpha',
          limit: 2,
          offset: 0,
        },
        errors,
      });

      expect(firstPage.total).toBe(4);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.entities).toHaveLength(2);
      expect(firstPage.entities[0]).toMatchObject({
        entityType: 'podcast',
        entityId: recentPodcast.id,
        title: recentPodcast.title,
      });
      expect(firstPage.entities[1]).toMatchObject({
        entityType: 'voiceover',
        entityId: recentVoiceover.id,
        title: recentVoiceover.title,
      });
      expectIsoTimestamp(firstPage.entities[0]!.updatedAt);

      const secondPage = await handlers.entities({
        context: createMockContext(runtime, admin),
        input: {
          userId: member.id,
          query: 'alpha',
          limit: 2,
          offset: 2,
        },
        errors,
      });

      expect(secondPage.total).toBe(4);
      expect(secondPage.hasMore).toBe(false);
      expect(secondPage.entities.map((entity) => entity.entityType)).toEqual([
        'persona',
        'source',
      ]);

      const personaOnly = await handlers.entities({
        context: createMockContext(runtime, admin),
        input: {
          userId: member.id,
          entityType: 'persona',
          limit: 10,
          offset: 0,
        },
        errors,
      });

      expect(personaOnly.total).toBe(1);
      expect(personaOnly.entities[0]).toMatchObject({
        entityType: 'persona',
        entityId: personaId,
        title: 'Alpha Persona',
        subtitle: 'Analyst',
        status: null,
      });
    });
  });
});
