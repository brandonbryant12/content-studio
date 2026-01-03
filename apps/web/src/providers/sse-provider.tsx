// providers/sse-provider.tsx

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSSE, type SSEConnectionState } from '@/shared/hooks/use-sse';
import { authClient } from '@/clients/authClient';

interface SSEContextValue {
  connectionState: SSEConnectionState;
  reconnect: () => void;
}

const SSEContext = createContext<SSEContextValue | null>(null);

export function SSEProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const sseState = useSSE({ enabled: isAuthenticated });

  return <SSEContext.Provider value={sseState}>{children}</SSEContext.Provider>;
}

export function useSSEContext(): SSEContextValue {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEContext must be used within SSEProvider');
  }
  return context;
}

/**
 * Hook to invalidate all queries when SSE reconnects after disconnection.
 * Use this at the app root to catch any events missed during disconnection.
 */
export function useSSERecovery() {
  const queryClient = useQueryClient();
  const { connectionState } = useSSEContext();
  // Track if we've been connected before (skip initial connection)
  const hasBeenConnectedRef = useRef(false);
  // Track if we had a failure that needs recovery
  const needsRecoveryRef = useRef(false);

  useEffect(() => {
    // Mark as having been connected
    if (connectionState === 'connected') {
      // If we need recovery and we're now connected, invalidate
      if (needsRecoveryRef.current && hasBeenConnectedRef.current) {
        queryClient.invalidateQueries();
      }
      hasBeenConnectedRef.current = true;
      needsRecoveryRef.current = false;
    }

    // Mark that we need recovery when disconnected or in error state
    if (connectionState === 'disconnected' || connectionState === 'error') {
      needsRecoveryRef.current = true;
    }
  }, [connectionState, queryClient]);
}
