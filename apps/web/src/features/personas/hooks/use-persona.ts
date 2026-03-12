import {
  useSuspenseQuery,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type Persona = RouterOutput['personas']['get'];

interface PersonaAccessOptions {
  userId?: string;
}

/**
 * Fetch a single persona by ID.
 * Uses Suspense - wrap with SuspenseBoundary.
 */
export function usePersona(
  personaId: string,
  options: PersonaAccessOptions = {},
): UseSuspenseQueryResult<Persona, Error> {
  return useSuspenseQuery(
    apiClient.personas.get.queryOptions({
      input: { id: personaId, userId: options.userId },
    }),
  );
}

/**
 * Get the query key for a persona.
 * Useful for cache operations.
 */
export function getPersonaQueryKey(
  personaId: string,
  options: PersonaAccessOptions = {},
): QueryKey {
  return apiClient.personas.get.queryOptions({
    input: { id: personaId, userId: options.userId },
  }).queryKey;
}
