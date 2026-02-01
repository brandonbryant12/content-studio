// shared/hooks/use-sse.ts

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback, useState } from 'react';
import type { SSEEvent } from '@repo/api/contracts';
import {
  handleJobCompletion,
  handleVoiceoverJobCompletion,
  handleEntityChange,
} from './sse-handlers';
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

  // Store callbacks in refs to avoid triggering reconnections when they change
  const onConnectionChangeRef = useRef(onConnectionChange);
  const queryClientRef = useRef(queryClient);

  // Keep refs up to date without triggering effect re-runs
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  // Stable callback - uses refs internally
  const updateConnectionState = useCallback((state: SSEConnectionState) => {
    setConnectionState(state);
    onConnectionChangeRef.current?.(state);
  }, []);

  // Stable callback - uses refs internally
  const handleEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case 'connected':
          reconnectAttemptsRef.current = 0;
          updateConnectionState('connected');
          break;

        case 'job_completion':
          handleJobCompletion(event, queryClientRef.current);
          break;

        case 'voiceover_job_completion':
          handleVoiceoverJobCompletion(event, queryClientRef.current);
          break;

        case 'entity_change':
          handleEntityChange(event, queryClientRef.current);
          break;
      }
    },
    [updateConnectionState],
  );

  // Store connect function ref for recursive timeout calls
  const connectRef = useRef<(() => void) | undefined>(undefined);

  // Stable - no dependencies that change on every render
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      RECONNECT_MAX_DELAY,
    );
    return delay + Math.random() * 1000; // Jitter
  }, []);

  // Now only depends on `enabled` - all other deps are stable
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

        // Use ref to avoid stale closure in recursive timeout
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current?.();
        }, delay);
      } else {
        updateConnectionState('error');
      }
    };
  }, [enabled, handleEvent, updateConnectionState, getReconnectDelay]);

  // Keep connectRef up to date for recursive timeout calls
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

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
