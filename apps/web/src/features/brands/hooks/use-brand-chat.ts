// features/brands/hooks/use-brand-chat.ts
// Custom chat hook for brand building conversations

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/env';
import { getBrandQueryKey } from './use-brand';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

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
  initialMessages?: ChatMessage[];
  onError?: (error: Error) => void;
}

/**
 * Custom hook for brand chat using streaming API.
 * Manages chat state and sends messages to the brand-chat endpoint.
 */
export function useBrandChat({
  brandId,
  initialMessages = [],
  onError,
}: UseBrandChatOptions): UseBrandChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
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
    setIsLoading(false);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Reset messages when brandId changes
  useEffect(() => {
    setMessages(initialMessages);
    setError(null);
  }, [brandId]); // Don't include initialMessages to avoid infinite loop

  // Send message
  const sendMessage = useCallback(
    async (content?: string) => {
      const messageContent = content ?? input;
      if (!messageContent.trim() || isLoading) return;

      // Clear input immediately
      setInput('');
      setError(null);

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: messageContent.trim(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsLoading(true);

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

        setMessages((prev) => [...prev, assistantMessage]);

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
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              updated[updated.length - 1] = {
                ...lastMessage,
                content: accumulatedContent,
              };
            }
            return updated;
          });
        }

        // Invalidate brand query to refresh data after AI updates
        queryClient.invalidateQueries({ queryKey: getBrandQueryKey(brandId) });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, don't set error
          return;
        }
        const error =
          err instanceof Error ? err : new Error('Failed to send message');
        setError(error);
        onError?.(error);

        // Remove the empty assistant message if there was an error
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && !lastMessage.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [brandId, input, isLoading, messages, onError, queryClient],
  );

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    stop,
  };
}
