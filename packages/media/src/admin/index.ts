export { AdminUserNotFound } from '../errors';

export {
  AdminRepo,
  AdminRepoLive,
  type AdminRepoService,
  type SearchUsersOptions,
  type ListUserAIUsageEventsOptions,
  type AIUsageByModality,
  type AIUsageByProvider,
  type AIUsageTimelinePoint,
  type UserAIUsageSummary,
} from './repos/admin-repo';

export {
  searchUsers,
  type SearchUsersInput,
  type SearchUsersResult,
} from './use-cases/search-users';

export {
  listUserEntities,
  type ListUserEntitiesInput,
  type ListUserEntitiesResult,
} from './use-cases/list-user-entities';

export {
  getUserDetail,
  type GetUserDetailInput,
  type GetUserDetailResult,
  type UserEntityCounts,
  type UserRecentEntities,
} from './use-cases/get-user-detail';
