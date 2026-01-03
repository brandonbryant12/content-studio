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

export interface UseSSEReturn {
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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptsRef = useRef(0);

  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>('disconnected');

  const updateConnectionState = useCallback(
    (state: SSEConnectionState) => {
      setConnectionState(state);
      onConnectionChange?.(state);
    },
    [onConnectionChange],
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
    [queryClient, updateConnectionState],
  );

  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      RECONNECT_MAX_DELAY,
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
