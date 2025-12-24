import { useEffect, useRef } from 'react';
import type { SSEEvent } from '@repo/api/contracts';
import { podcastUtils, documentUtils } from './collections';
import { env } from '@/env';

/**
 * Hook to subscribe to Server-Sent Events for real-time data updates.
 *
 * When the server emits events (e.g., job completion, entity changes),
 * this hook triggers a refetch of the affected collection.
 *
 * Should be used in the app's root layout to maintain a single SSE connection.
 */
export function useSSESubscription() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const connect = () => {
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      const url = `${env.PUBLIC_SERVER_URL}${env.PUBLIC_SERVER_API_PATH}/events`;
      const eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onopen = () => {
        console.log('[SSE] Connected');
      };

      eventSource.onmessage = (event) => {
        try {
          // Skip heartbeat messages
          if (event.data === ':heartbeat') return;

          const data = JSON.parse(event.data) as SSEEvent;
          handleSSEEvent(data);
        } catch (error) {
          console.error('[SSE] Failed to parse event:', error);
        }
      };

      eventSource.onerror = () => {
        console.warn('[SSE] Connection error, reconnecting...');
        eventSource.close();
        eventSourceRef.current = null;

        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      eventSourceRef.current = eventSource;
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
}

/**
 * Handle incoming SSE events by triggering collection refetches
 */
function handleSSEEvent(event: SSEEvent) {
  switch (event.type) {
    case 'connected':
      console.log('[SSE] Authenticated as user:', event.userId);
      break;

    case 'entity_change':
      console.log('[SSE] Entity change:', event.entityType, event.changeType);
      // Unified utilities handle both collection + query cache invalidation
      switch (event.entityType) {
        case 'podcast':
          podcastUtils.refetch();
          break;
        case 'document':
          documentUtils.refetch();
          break;
      }
      break;

    case 'job_completion':
      console.log(
        '[SSE] Job completed:',
        event.jobType,
        event.status,
        event.podcastId,
      );
      // Podcast jobs always affect the podcast collection
      podcastUtils.refetch();
      break;
  }
}
