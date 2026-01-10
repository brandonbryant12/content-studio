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
export {
  useExtractKeyPoints,
  type KeyPointSuggestion,
} from './use-ai-extraction';

// Selection hooks
export {
  useSelections,
  useAddSelection,
  useRemoveSelection,
  useUpdateSelection,
  useReorderSelections,
  SELECTION_SOFT_LIMIT,
  MAX_SELECTION_LENGTH,
  type UseSelectionsOptions,
  type UseSelectionsReturn,
} from './use-selections';

// Settings hooks
export {
  useInfographicSettings,
  ASPECT_RATIOS,
  type AspectRatioId,
  type StyleOptions,
  type UseInfographicSettingsReturn,
} from './use-infographic-settings';
