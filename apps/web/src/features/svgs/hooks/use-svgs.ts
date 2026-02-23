import { useSuspenseQuery, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';

export function getSvgListQueryKey(): QueryKey {
  return apiClient.svgs.list.queryOptions({ input: {} }).queryKey;
}

export function useSvgs() {
  return useSuspenseQuery(apiClient.svgs.list.queryOptions({ input: {} }));
}
