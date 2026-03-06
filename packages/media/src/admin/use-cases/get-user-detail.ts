import { requireRole, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import type {
  AIUsageEvent,
  DbUser,
  Infographic,
  Persona,
  PodcastListItem,
  SourceListItem,
  Voiceover,
} from '@repo/db/schema';
import { InfographicRepo } from '../../infographic';
import { PersonaRepo } from '../../persona';
import { PodcastRepo } from '../../podcast';
import { defineAuthedUseCase } from '../../shared';
import { SourceRepo } from '../../source';
import { VoiceoverRepo } from '../../voiceover';
import { AdminRepo, type UserAIUsageSummary } from '../repos/admin-repo';

export interface GetUserDetailInput {
  readonly userId: string;
  readonly usagePeriod?: '7d' | '30d' | '90d' | 'all';
  readonly entityLimit?: number;
  readonly usageLimit?: number;
}

export interface UserEntityCounts {
  readonly sources: number;
  readonly podcasts: number;
  readonly voiceovers: number;
  readonly personas: number;
  readonly infographics: number;
}

export interface UserRecentEntities {
  readonly sources: readonly SourceListItem[];
  readonly podcasts: readonly PodcastListItem[];
  readonly voiceovers: readonly Voiceover[];
  readonly personas: readonly Persona[];
  readonly infographics: readonly Infographic[];
}

export interface GetUserDetailResult {
  readonly user: DbUser;
  readonly entityCounts: UserEntityCounts;
  readonly recentEntities: UserRecentEntities;
  readonly aiUsageSummary: UserAIUsageSummary;
  readonly aiUsageEvents: readonly AIUsageEvent[];
}

const DEFAULT_ENTITY_LIMIT = 6;
const DEFAULT_USAGE_LIMIT = 25;

const usagePeriodToDate = (
  period: GetUserDetailInput['usagePeriod'],
): Date | undefined => {
  if (!period || period === 'all') {
    return undefined;
  }

  const now = Date.now();

  switch (period) {
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now - 90 * 24 * 60 * 60 * 1000);
  }
};

export const getUserDetail = defineAuthedUseCase<GetUserDetailInput>()({
  name: 'useCase.getUserDetail',
  span: ({ input }) => ({
    resourceId: input.userId,
    attributes: {
      'admin.targetUserId': input.userId,
      'usage.period': input.usagePeriod ?? '30d',
      'pagination.entityLimit': input.entityLimit ?? DEFAULT_ENTITY_LIMIT,
      'pagination.usageLimit': input.usageLimit ?? DEFAULT_USAGE_LIMIT,
    },
  }),
  run: ({ input }) =>
    Effect.gen(function* () {
      yield* requireRole(Role.ADMIN);

      const adminRepo = yield* AdminRepo;
      const sourceRepo = yield* SourceRepo;
      const podcastRepo = yield* PodcastRepo;
      const voiceoverRepo = yield* VoiceoverRepo;
      const personaRepo = yield* PersonaRepo;
      const infographicRepo = yield* InfographicRepo;

      const entityLimit = input.entityLimit ?? DEFAULT_ENTITY_LIMIT;
      const usageLimit = input.usageLimit ?? DEFAULT_USAGE_LIMIT;
      const usageSince = usagePeriodToDate(input.usagePeriod ?? '30d');

      const [
        user,
        sources,
        sourceCount,
        podcasts,
        podcastCount,
        voiceovers,
        voiceoverCount,
        personas,
        personaCount,
        infographics,
        infographicCount,
        aiUsageEvents,
        aiUsageSummary,
      ] = yield* Effect.all(
        [
          adminRepo.findUserById(input.userId),
          sourceRepo.list({ createdBy: input.userId, limit: entityLimit }),
          sourceRepo.count({ createdBy: input.userId }),
          podcastRepo.list({ createdBy: input.userId, limit: entityLimit }),
          podcastRepo.count({ createdBy: input.userId }),
          voiceoverRepo.list({ userId: input.userId, limit: entityLimit }),
          voiceoverRepo.count({ userId: input.userId }),
          personaRepo.list({ createdBy: input.userId, limit: entityLimit }),
          personaRepo.count({ createdBy: input.userId }),
          infographicRepo.list({ createdBy: input.userId, limit: entityLimit }),
          infographicRepo.count({ createdBy: input.userId }),
          adminRepo.listUserAIUsageEvents({
            userId: input.userId,
            since: usageSince,
            limit: usageLimit,
          }),
          adminRepo.getUserAIUsageSummary(input.userId, usageSince),
        ],
        { concurrency: 'unbounded' },
      );

      return {
        user,
        entityCounts: {
          sources: sourceCount,
          podcasts: podcastCount,
          voiceovers: voiceoverCount,
          personas: personaCount,
          infographics: infographicCount,
        },
        recentEntities: {
          sources,
          podcasts,
          voiceovers,
          personas,
          infographics,
        },
        aiUsageSummary,
        aiUsageEvents,
      };
    }),
});
