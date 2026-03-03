import { authClient, type AuthSession } from '@/clients/authClient';

interface UseSessionGuardReturn {
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
  const { data: sessionData, isPending } = authClient.useSession();
  const session = sessionData ?? null;
  const user = session?.user ?? null;

  return {
    session,
    user,
    isPending,
    isAuthenticated: !isPending && user !== null,
  };
}
