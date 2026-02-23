import { useSuspenseQuery, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';

export function getSvgQueryKey(svgId: string): QueryKey {
  return apiClient.svgs.get.queryOptions({ input: { id: svgId } }).queryKey;
}

export function useSvg(svgId: string) {
  return useSuspenseQuery(apiClient.svgs.get.queryOptions({ input: { id: svgId } }));
}
