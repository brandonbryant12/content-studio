import { useSessionGuard } from './use-session-guard';

/**
 * Check if the current user has the admin role.
 * Encapsulates the type assertion needed because better-auth's
 * session type doesn't include the custom `role` field.
 */
export function useIsAdmin(): boolean {
  const { user } = useSessionGuard();
  return (user as { role?: string } | null)?.role === 'admin';
}
