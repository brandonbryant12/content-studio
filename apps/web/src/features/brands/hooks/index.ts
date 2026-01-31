// features/brands/hooks/index.ts
// Barrel export for brand feature hooks

// Query hooks
export { useBrand, getBrandQueryKey } from './use-brand';
export {
  useBrandList,
  useSuspenseBrandList,
  getBrandListQueryKey,
  useBrandsOrdered,
} from './use-brand-list';

// Mutation hooks
export { useOptimisticCreate } from './use-optimistic-create';
export { useOptimisticUpdate } from './use-optimistic-update';
export { useOptimisticDeleteList } from './use-optimistic-delete-list';

// Chat hook
export { useBrandChat, type UseBrandChatReturn } from './use-brand-chat';

// Progress hooks
export {
  useBrandProgress,
  type BrandProgress,
  type ProgressItem,
} from './use-brand-progress';
export { useQuickReplies } from './use-quick-replies';
