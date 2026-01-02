# Real-Time Updates

This document defines the SSE pattern for query invalidation in Content Studio.

## Overview

A global SSE connection listens for server events and invalidates TanStack Query caches. This enables:

- **Automatic refresh** when jobs complete
- **Multi-tab sync** when data changes elsewhere
- **Optimistic confirmation** after mutations

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SSEProvider (app root)                                  │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │  useSSE hook                                        │ │   │
│  │  │  - Maintains EventSource connection                 │ │   │
│  │  │  - Handles reconnection with backoff                │ │   │
│  │  │  - Dispatches events to handlers                    │ │   │
│  │  └───────────────────────────────────────────────────┬─┘ │   │
│  │                                                      │     │   │
│  │  ┌───────────────────────────────────────────────────▼─┐ │   │
│  │  │  Event Handlers                                     │ │   │
│  │  │  - job_completion → invalidate podcast queries      │ │   │
│  │  │  - entity_change → invalidate affected queries      │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┬─┘
                                                                │
                                                    SSE Connection
                                                                │
┌───────────────────────────────────────────────────────────────▼─┐
│  Server                                                          │
│  /api/events endpoint                                            │
│  - Per-user connections                                          │
│  - Emits job_completion, entity_change events                    │
└──────────────────────────────────────────────────────────────────┘
```

## SSE Hook

```typescript
// shared/hooks/use-sse.ts

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SSEEvent } from '@repo/api/contracts';
import { handleJobCompletion, handleEntityChange } from './sse-handlers';
import { env } from '@/env';

export type SSEConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface SSEOptions {
  enabled?: boolean;
  onConnectionChange?: (state: SSEConnectionState) => void;
}

interface UseSSEReturn {
  connectionState: SSEConnectionState;
  reconnect: () => void;
}

const SSE_ENDPOINT = `${env.PUBLIC_SERVER_URL}${env.PUBLIC_SERVER_API_PATH}/events`;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const RECONNECT_MAX_ATTEMPTS = 10;

export function useSSE(options: SSEOptions = {}): UseSSEReturn {
  const { enabled = true, onConnectionChange } = options;

  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptsRef = useRef(0);

  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>('disconnected');

  const updateConnectionState = useCallback(
    (state: SSEConnectionState) => {
      setConnectionState(state);
      onConnectionChange?.(state);
    },
    [onConnectionChange]
  );

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case 'connected':
          reconnectAttemptsRef.current = 0;
          updateConnectionState('connected');
          break;

        case 'job_completion':
          handleJobCompletion(event, queryClient);
          break;

        case 'entity_change':
          handleEntityChange(event, queryClient);
          break;
      }
    },
    [queryClient, updateConnectionState]
  );

  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      RECONNECT_MAX_DELAY
    );
    return delay + Math.random() * 1000; // Jitter
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Cleanup existing
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    updateConnectionState('connecting');

    const eventSource = new EventSource(SSE_ENDPOINT, {
      withCredentials: true,
    });
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        if (event.data === ':heartbeat') return;
        const parsed: SSEEvent = JSON.parse(event.data);
        handleEvent(parsed);
      } catch (err) {
        console.error('[SSE] Failed to parse event:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;

      if (reconnectAttemptsRef.current < RECONNECT_MAX_ATTEMPTS) {
        updateConnectionState('disconnected');
        const delay = getReconnectDelay();
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(connect, delay);
      } else {
        updateConnectionState('error');
      }
    };
  }, [enabled, handleEvent, updateConnectionState, getReconnectDelay]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    if (enabled) connect();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, connect]);

  return { connectionState, reconnect };
}
```

## Event Handlers

```typescript
// shared/hooks/sse-handlers.ts

import type { QueryClient } from '@tanstack/react-query';
import type { JobCompletionEvent, EntityChangeEvent } from '@repo/api/contracts';
import { apiClient } from '@/clients/api-client';

// ============================================================================
// Query Key Helpers
// ============================================================================

const getPodcastQueryKey = (podcastId: string) =>
  apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }).queryKey;

const getPodcastsListQueryKey = () =>
  apiClient.podcasts.list.queryOptions({ input: {} }).queryKey;

const getDocumentQueryKey = (documentId: string) =>
  apiClient.documents.get.queryOptions({ input: { id: documentId } }).queryKey;

const getDocumentsListQueryKey = () =>
  apiClient.documents.list.queryOptions({ input: {} }).queryKey;

// ============================================================================
// Event Handlers
// ============================================================================

export function handleJobCompletion(
  event: JobCompletionEvent,
  queryClient: QueryClient
): void {
  const { jobType, podcastId } = event;

  // Invalidate specific podcast
  if (podcastId) {
    queryClient.invalidateQueries({
      queryKey: getPodcastQueryKey(podcastId),
    });
  }

  // Invalidate list for job types that affect list display
  switch (jobType) {
    case 'generate-podcast':
    case 'generate-script':
    case 'generate-audio':
      queryClient.invalidateQueries({
        queryKey: getPodcastsListQueryKey(),
      });
      break;
  }
}

export function handleEntityChange(
  event: EntityChangeEvent,
  queryClient: QueryClient
): void {
  const { entityType, changeType, entityId } = event;

  switch (entityType) {
    case 'podcast':
      queryClient.invalidateQueries({
        queryKey: getPodcastQueryKey(entityId),
      });
      if (changeType === 'insert' || changeType === 'delete') {
        queryClient.invalidateQueries({
          queryKey: getPodcastsListQueryKey(),
        });
      }
      break;

    case 'document':
      queryClient.invalidateQueries({
        queryKey: getDocumentQueryKey(entityId),
      });
      if (changeType === 'insert' || changeType === 'delete') {
        queryClient.invalidateQueries({
          queryKey: getDocumentsListQueryKey(),
        });
      }
      break;
  }
}
```

## SSE Provider

```typescript
// providers/sse-provider.tsx

import { createContext, useContext, type ReactNode } from 'react';
import { useSSE, type SSEConnectionState } from '@/shared/hooks/use-sse';
import { authClient } from '@/clients/auth-client';

interface SSEContextValue {
  connectionState: SSEConnectionState;
  reconnect: () => void;
}

const SSEContext = createContext<SSEContextValue | null>(null);

export function SSEProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const sseState = useSSE({ enabled: isAuthenticated });

  return (
    <SSEContext.Provider value={sseState}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSEContext(): SSEContextValue {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEContext must be used within SSEProvider');
  }
  return context;
}
```

## App Integration

```typescript
// router.tsx

import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter as createTanstackRouter } from '@tanstack/react-router';
import { queryClient } from '@/clients/query-client';
import { SSEProvider } from '@/providers/sse-provider';
import { routeTree } from '@/routeTree.gen';

export function createRouter() {
  return createTanstackRouter({
    routeTree,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <SSEProvider>
          {children}
        </SSEProvider>
      </QueryClientProvider>
    ),
  });
}
```

## How Optimistic + SSE Work Together

```
User clicks "Generate"
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  onMutate                                                │
│  • Cancel in-flight queries                              │
│  • Save previous state                                   │
│  • Set optimistic state: status = 'drafting'            │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  UI shows: "Generating..."                               │
│  (Optimistic - not confirmed by server yet)              │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  mutationFn executes                                     │
│  Server returns: { jobId: 'job_123' }                    │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  onSuccess (optional)                                    │
│  • Show toast: "Generation started"                      │
│  • NO invalidation - wait for SSE                        │
└──────────────────────────────────────────────────────────┘
        │
        │  (Job processes on server...)
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  SSE Event: job_completion                               │
│  { type: 'job_completion', podcastId, status: 'ready' }  │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  handleJobCompletion                                     │
│  • queryClient.invalidateQueries({ queryKey })           │
│  • Query refetches real data from server                 │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  UI updates with real data                               │
│  status = 'ready', segments populated, audioUrl set      │
└──────────────────────────────────────────────────────────┘
```

## Error Recovery

When SSE reconnects after disconnection, invalidate all queries to catch missed events:

```typescript
// shared/hooks/use-sse-recovery.ts

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSSEContext } from '@/providers/sse-provider';

export function useSSERecovery() {
  const queryClient = useQueryClient();
  const { connectionState } = useSSEContext();
  const previousStateRef = useRef(connectionState);

  useEffect(() => {
    const previous = previousStateRef.current;
    previousStateRef.current = connectionState;

    // Reconnected after being disconnected/error
    if (
      (previous === 'disconnected' || previous === 'error') &&
      connectionState === 'connected'
    ) {
      // Invalidate all to catch any missed events
      queryClient.invalidateQueries();
    }
  }, [connectionState, queryClient]);
}
```

## Connection Status Indicator (Optional)

```typescript
// shared/components/connection-indicator.tsx

import { useSSEContext } from '@/providers/sse-provider';
import { cn } from '@repo/ui/lib/utils';

export function ConnectionIndicator() {
  const { connectionState, reconnect } = useSSEContext();

  if (connectionState === 'connected') return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 rounded-lg px-4 py-2 text-sm shadow-lg',
        connectionState === 'connecting' && 'bg-warning text-warning-foreground',
        connectionState === 'disconnected' && 'bg-muted text-muted-foreground',
        connectionState === 'error' && 'bg-destructive text-destructive-foreground'
      )}
    >
      {connectionState === 'connecting' && 'Connecting...'}
      {connectionState === 'disconnected' && 'Reconnecting...'}
      {connectionState === 'error' && (
        <button onClick={reconnect} className="underline">
          Connection lost. Click to retry.
        </button>
      )}
    </div>
  );
}
```

## Event Types Reference

| Event Type | Payload | Action |
|------------|---------|--------|
| `connected` | `{ userId }` | Reset reconnect counter |
| `job_completion` | `{ jobId, jobType, status, podcastId }` | Invalidate podcast queries |
| `entity_change` | `{ entityType, changeType, entityId }` | Invalidate entity queries |

## Anti-Patterns

### Polling Instead of SSE

```typescript
// WRONG - polling with SSE active
useQuery({
  refetchInterval: 5000,  // Don't poll!
});

// CORRECT - let SSE handle updates
useQuery({
  // No refetchInterval - SSE triggers invalidation
});
```

### Invalidating in onSettled

```typescript
// WRONG - double refetch
onSettled: () => {
  queryClient.invalidateQueries({ queryKey });  // SSE will also do this!
}

// CORRECT - let SSE handle it
// No onSettled needed
```

### Creating EventSource Per Component

```typescript
// WRONG - multiple connections
function Component() {
  useEffect(() => {
    const es = new EventSource('/api/events');  // Don't!
    return () => es.close();
  }, []);
}

// CORRECT - use global provider
function Component() {
  const { connectionState } = useSSEContext();  // Shared connection
}
```

### Not Handling Reconnection

```typescript
// WRONG - no reconnection logic
eventSource.onerror = () => {
  console.error('SSE error');  // Connection stays dead!
};

// CORRECT - reconnect with backoff
eventSource.onerror = () => {
  eventSource.close();
  setTimeout(connect, getReconnectDelay());
};
```
