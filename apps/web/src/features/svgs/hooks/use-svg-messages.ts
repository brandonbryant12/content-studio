import { useQuery, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';

export function getSvgMessagesQueryKey(svgId: string): QueryKey {
  return apiClient.svgs.messages.queryOptions({ input: { id: svgId } }).queryKey;
}

export function useSvgMessages(svgId: string) {
  return useQuery(apiClient.svgs.messages.queryOptions({ input: { id: svgId } }));
}
