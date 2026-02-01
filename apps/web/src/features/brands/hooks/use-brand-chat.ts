// features/brands/hooks/use-brand-chat.ts
// Custom chat hook for brand building conversations

import { useQueryClient } from '@tanstack/react-query';
import { useReducer, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage } from './brand-chat-reducer';
import {
  BrandChatState,
  BrandChatAction,
  brandChatReducer,
  createInitialBrandChatState,
} from './brand-chat-reducer';
import { getBrandQueryKey } from './use-brand';
import { env } from '@/env';

export interface UseBrandChatReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content?: string) => Promise<void>;
  clearMessages: () => void;
  stop: () => void;
}

interface UseBrandChatOptions {
  brandId: string;
  /** Optional wizard step key for step-aware AI assistance */
  stepKey?: string;
  initialMessages?: ChatMessage[];
  onError?: (error: Error) => void;
}

/**
 * Custom hook for brand chat using streaming API.
 * Manages chat state and sends messages to the brand-chat endpoint.
 */
export function useBrandChat({
  brandId,
  stepKey,
  initialMessages = [],
  onError,
}: UseBrandChatOptions): UseBrandChatReturn {
  const [state, dispatch] = useReducer(
    brandChatReducer,
    createInitialBrandChatState(initialMessages),
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  // Generate unique message ID
  const generateId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Stop streaming
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  // Reset messages when brandId changes
  useEffect(() => {
    dispatch({ type: 'RESET', payload: { messages: initialMessages } });
  }, [brandId]); // Don't include initialMessages to avoid infinite loop

  // Send message
  const sendMessage = useCallback(
    async (content?: string) => {
      const messageContent = content ?? state.input;
      if (!messageContent.trim() || state.isLoading) return;

      // Clear input immediately
      dispatch({ type: 'CLEAR_INPUT' });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: messageContent.trim(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
      const newMessages = [...state.messages, userMessage];
      dispatch({ type: 'SET_LOADING', payload: true });

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `${env.PUBLIC_SERVER_URL}${env.PUBLIC_SERVER_API_PATH}/brand-chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              brandId,
              stepKey,
              messages: newMessages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
            }),
            credentials: 'include',
            signal: abortControllerRef.current.signal,
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error ?? `HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        // Create assistant message placeholder
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: '',
        };

        dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          // Update the assistant message with accumulated content
          dispatch({
            type: 'UPDATE_LAST_ASSISTANT_MESSAGE',
            payload: accumulatedContent,
          });
        }

        // Invalidate brand query to refresh data after AI updates
        queryClient.invalidateQueries({ queryKey: getBrandQueryKey(brandId) });

        // NOTE: We don't auto-advance anymore - the AI responding doesn't mean
        // the step is complete. User should click "Next" when ready.
        // The SSE entity_change events will refresh the UI when data is saved.
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, don't set error
          return;
        }
        const error =
          err instanceof Error ? err : new Error('Failed to send message');
        dispatch({ type: 'SET_ERROR', payload: error });
        onError?.(error);

        // Remove the empty assistant message if there was an error
        dispatch({ type: 'REMOVE_LAST_MESSAGE' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        abortControllerRef.current = null;
      }
    },
    [
      brandId,
      stepKey,
      state.input,
      state.isLoading,
      state.messages,
      onError,
      queryClient,
    ],
  );

  // Create setInput callback
  const setInput = useCallback((input: string) => {
    dispatch({ type: 'SET_INPUT', payload: input });
  }, []);

  return {
    messages: state.messages,
    input: state.input,
    setInput,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    clearMessages,
    stop,
  };
}
