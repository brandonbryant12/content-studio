// features/infographics/hooks/index.ts
// Barrel export for infographic feature hooks

// Query hooks
export { useInfographic, getInfographicQueryKey } from './use-infographic';
export {
  useInfographicList,
  useSuspenseInfographicList,
  getInfographicListQueryKey,
} from './use-infographic-list';

// Mutation hooks
export { useCreateInfographic } from './use-create-infographic';
// Note: useOptimisticDelete is exported as useDeleteInfographic to avoid
// name collision with podcasts' useOptimisticDelete in the features barrel export
export { useOptimisticDelete as useDeleteInfographic } from './use-optimistic-delete';
