import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  handleJobCompletion,
  handleVoiceoverJobCompletion,
  handleInfographicJobCompletion,
  handleDocumentJobCompletion,
  handleEntityChange,
  handleActivityLogged,
} from './sse-handlers';
import { rawApiClient } from '@/clients/apiClient';

export type SSEConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

const MAX_ATTEMPTS = 10;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

function getDelay(attempt: number): number {
  return Math.min(BASE_DELAY * 2 ** attempt, MAX_DELAY) + Math.random() * 1000;
}

export function useSSE({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>('disconnected');
  const controllerRef = useRef<AbortController | null>(null);

  const connect = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setConnectionState('connecting');

    (async () => {
      let attempts = 0;
      while (!controller.signal.aborted && attempts < MAX_ATTEMPTS) {
        try {
          const iterator = await rawApiClient.events.subscribe(undefined, {
            signal: controller.signal,
          });

          for await (const event of iterator) {
            if (controller.signal.aborted) break;
            const qc = queryClientRef.current;

            switch (event.type) {
              case 'connected':
                attempts = 0;
                setConnectionState('connected');
                break;
              case 'job_completion':
                handleJobCompletion(event, qc);
                break;
              case 'voiceover_job_completion':
                handleVoiceoverJobCompletion(event, qc);
                break;
              case 'infographic_job_completion':
                handleInfographicJobCompletion(event, qc);
                break;
              case 'document_job_completion':
                handleDocumentJobCompletion(event, qc);
                break;
              case 'entity_change':
                handleEntityChange(event, qc);
                break;
              case 'activity_logged':
                handleActivityLogged(event, qc);
                break;
            }
          }
        } catch {
          if (controller.signal.aborted) break;
        }

        // Stream ended or errored — reconnect
        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
          setConnectionState('error');
          break;
        }
        setConnectionState('disconnected');
        await new Promise((r) => setTimeout(r, getDelay(attempts)));
      }
    })();
  }, []);

  useEffect(() => {
    if (enabled) connect();
    return () => controllerRef.current?.abort();
  }, [enabled, connect]);

  return { connectionState, reconnect: connect };
}
