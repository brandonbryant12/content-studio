import {
  serializeAIUsageEventsEffect,
  serializeInfographicsEffect,
  serializePersonasEffect,
  serializePodcastListItemsEffect,
  serializeSourceListItemsEffect,
  serializeUserEffect,
  serializeUsersEffect,
  serializeVoiceoverListItemsEffect,
} from '@repo/db/schema';
import {
  getUserDetail,
  listUserEntities,
  searchUsers,
} from '@repo/media/admin';
import { Effect } from 'effect';
import { bindEffectProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import activityRouter from './activity';

const toIsoTimestamp = (value: Date | string) =>
  (value instanceof Date ? value : new Date(value)).toISOString();

const serializeAdminUserEntities = (
  entities: ReadonlyArray<{
    entityType: 'source' | 'podcast' | 'voiceover' | 'persona' | 'infographic';
    entityId: string;
    title: string;
    subtitle: string | null;
    status: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }>,
) =>
  entities.map((entity) => ({
    entityType: entity.entityType,
    entityId: entity.entityId,
    title: entity.title,
    subtitle: entity.subtitle,
    status: entity.status,
    createdAt: toIsoTimestamp(entity.createdAt),
    updatedAt: toIsoTimestamp(entity.updatedAt),
  }));

const usersRouter = {
  search: protectedProcedure.admin.users.search.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        searchUsers(input).pipe(
          Effect.flatMap((result) => serializeUsersEffect([...result.users])),
        ),
        {
          attributes: {
            'pagination.limit': input.limit ?? 20,
            ...(input.query?.trim()
              ? { 'search.query': input.query.trim() }
              : {}),
          },
        },
      ),
  ),

  entities: protectedProcedure.admin.users.entities.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        listUserEntities(input).pipe(
          Effect.map((result) => ({
            entities: serializeAdminUserEntities(result.entities),
            total: result.total,
            hasMore: result.hasMore,
          })),
        ),
        {
          attributes: {
            'admin.targetUserId': input.userId,
            'pagination.limit': input.limit ?? 12,
            'pagination.offset': input.offset ?? 0,
            ...(input.query?.trim()
              ? { 'search.query': input.query.trim() }
              : {}),
            ...(input.entityType
              ? { 'filter.entityType': input.entityType }
              : {}),
          },
        },
      ),
  ),

  get: protectedProcedure.admin.users.get.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getUserDetail(input).pipe(
          Effect.flatMap((result) =>
            Effect.all({
              user: serializeUserEffect(result.user),
              sources: serializeSourceListItemsEffect([
                ...result.recentEntities.sources,
              ]),
              podcasts: serializePodcastListItemsEffect([
                ...result.recentEntities.podcasts,
              ]),
              voiceovers: serializeVoiceoverListItemsEffect([
                ...result.recentEntities.voiceovers,
              ]),
              personas: serializePersonasEffect([
                ...result.recentEntities.personas,
              ]),
              infographics: serializeInfographicsEffect([
                ...result.recentEntities.infographics,
              ]),
              aiUsageEvents: serializeAIUsageEventsEffect([
                ...result.aiUsageEvents,
              ]),
            }).pipe(
              Effect.map(
                ({
                  user,
                  sources,
                  podcasts,
                  voiceovers,
                  personas,
                  infographics,
                  aiUsageEvents,
                }) => ({
                  user,
                  entityCounts: result.entityCounts,
                  recentEntities: {
                    sources,
                    podcasts,
                    voiceovers,
                    personas,
                    infographics,
                  },
                  aiUsageSummary: result.aiUsageSummary,
                  aiUsageEvents,
                }),
              ),
            ),
          ),
        ),
        {
          attributes: {
            'admin.targetUserId': input.userId,
            'usage.period': input.usagePeriod,
            'pagination.entityLimit': input.entityLimit ?? 6,
            'pagination.usageLimit': input.usageLimit ?? 25,
          },
        },
      ),
  ),
};

const adminRouter = {
  activity: activityRouter,
  users: usersRouter,
};

export default adminRouter;
