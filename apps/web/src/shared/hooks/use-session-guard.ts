import { authClient, type AuthSession } from '@/clients/authClient';

export interface UseSessionGuardReturn {
  session: AuthSession;
  user: NonNullable<AuthSession>['user'] | null;
  isPending: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook for guarding routes that require authentication.
 * Provides session state and authentication status.
 */
export function useSessionGuard(): UseSessionGuardReturn {
  const { data: session, isPending } = authClient.useSession();

  return {
    session: session ?? null,
    user: session?.user ?? null,
    isPending,
    isAuthenticated: !isPending && !!session?.user,
  };
}
