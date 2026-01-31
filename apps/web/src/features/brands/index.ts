// features/brands/index.ts
// Feature barrel - specific exports only to prevent bundle bloat

// Query hooks
export { useBrand, getBrandQueryKey } from './hooks/use-brand';
export {
  useBrandList,
  useSuspenseBrandList,
  getBrandListQueryKey,
  useBrandsOrdered,
} from './hooks/use-brand-list';

// Mutation hooks
export { useOptimisticCreate } from './hooks/use-optimistic-create';
export { useOptimisticUpdate } from './hooks/use-optimistic-update';
export { useOptimisticDeleteList } from './hooks/use-optimistic-delete-list';

// Chat hook
export { useBrandChat, type UseBrandChatReturn } from './hooks/use-brand-chat';

// Container components
export { BrandListContainer } from './components/brand-list-container';
export { BrandDetailContainer } from './components/brand-detail-container';

// Presenter components
export { BrandList, type BrandListProps } from './components/brand-list';
export { BrandDetail, type BrandDetailProps } from './components/brand-detail';
export {
  BrandItem,
  type BrandItemProps,
  type BrandListItem,
} from './components/brand-item';
export { BrandBuilder } from './components/brand-builder';

// Reusable components
export { BrandIcon } from './components/brand-icon';
