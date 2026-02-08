// features/infographics/hooks/use-infographic-versions.ts

import {
  useQuery,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type InfographicVersionList = RouterOutput['infographics']['listVersions'];

export type InfographicVersion = InfographicVersionList[number];

/**
 * Fetch versions for an infographic.
 */
export function useInfographicVersions(
  infographicId: string,
): UseQueryResult<InfographicVersionList, Error> {
  return useQuery(
    apiClient.infographics.listVersions.queryOptions({
      input: { id: infographicId },
    }),
  );
}

/**
 * Get the query key for infographic versions.
 */
export function getInfographicVersionsQueryKey(
  infographicId: string,
): QueryKey {
  return apiClient.infographics.listVersions.queryOptions({
    input: { id: infographicId },
  }).queryKey;
}
