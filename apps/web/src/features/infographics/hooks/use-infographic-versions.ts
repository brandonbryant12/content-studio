import {
  useQuery,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type InfographicVersionList = RouterOutput['infographics']['listVersions'];

export type InfographicVersion = InfographicVersionList[number];

interface InfographicVersionAccessOptions {
  userId?: string;
}

/**
 * Fetch versions for an infographic.
 */
export function useInfographicVersions(
  infographicId: string,
  options: InfographicVersionAccessOptions = {},
): UseQueryResult<InfographicVersionList, Error> {
  return useQuery(
    apiClient.infographics.listVersions.queryOptions({
      input: { id: infographicId, userId: options.userId },
    }),
  );
}

/**
 * Get the query key for infographic versions.
 */
export function getInfographicVersionsQueryKey(
  infographicId: string,
  options: InfographicVersionAccessOptions = {},
): QueryKey {
  return apiClient.infographics.listVersions.queryOptions({
    input: { id: infographicId, userId: options.userId },
  }).queryKey;
}
