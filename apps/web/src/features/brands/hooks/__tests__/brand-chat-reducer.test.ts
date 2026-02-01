import { describe, it, expect } from 'vitest';
import {
  brandChatReducer,
  createInitialBrandChatState,
  type BrandChatState,
  type BrandChatAction,
  type ChatMessage,
} from '../brand-chat-reducer';

describe('brandChatReducer', () => {
  const mockMessage: ChatMessage = {
    id: 'msg-1',
    role: 'user',
    content: 'Hello world',
  };

  const mockAssistantMessage: ChatMessage = {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hello! How can I help?',
  };

  const initialState: BrandChatState = {
    messages: [],
    input: '',
    isLoading: false,
    error: null,
  };

  describe('SET_INPUT', () => {
    it('sets the input value', () => {
      const action: BrandChatAction = {
        type: 'SET_INPUT',
        payload: 'test input',
      };

      const newState = brandChatReducer(initialState, action);

      expect(newState.input).toBe('test input');
      expect(newState).toEqual({
        ...initialState,
        input: 'test input',
      });
    });

    it('updates existing input value', () => {
      const stateWithInput = { ...initialState, input: 'old input' };
      const action: BrandChatAction = {
        type: 'SET_INPUT',
        payload: 'new input',
      };

      const newState = brandChatReducer(stateWithInput, action);

      expect(newState.input).toBe('new input');
    });
  });

  describe('CLEAR_INPUT', () => {
    it('clears the input value', () => {
      const stateWithInput = { ...initialState, input: 'some input' };
      const action: BrandChatAction = { type: 'CLEAR_INPUT' };

      const newState = brandChatReducer(stateWithInput, action);

      expect(newState.input).toBe('');
      expect(newState).toEqual({
        ...stateWithInput,
        input: '',
      });
    });

    it('handles empty input gracefully', () => {
      const action: BrandChatAction = { type: 'CLEAR_INPUT' };

      const newState = brandChatReducer(initialState, action);

      expect(newState.input).toBe('');
    });
  });

  describe('ADD_MESSAGE', () => {
    it('adds a message to empty list', () => {
      const action: BrandChatAction = {
        type: 'ADD_MESSAGE',
        payload: mockMessage,
      };

      const newState = brandChatReducer(initialState, action);

      expect(newState.messages).toEqual([mockMessage]);
      expect(newState.messages).toHaveLength(1);
    });

    it('adds a message to existing list', () => {
      const stateWithMessages = {
        ...initialState,
        messages: [mockMessage],
      };
      const action: BrandChatAction = {
        type: 'ADD_MESSAGE',
        payload: mockAssistantMessage,
      };

      const newState = brandChatReducer(stateWithMessages, action);

      expect(newState.messages).toEqual([mockMessage, mockAssistantMessage]);
      expect(newState.messages).toHaveLength(2);
    });

    it('preserves message order', () => {
      const message3: ChatMessage = {
        id: 'msg-3',
        role: 'user',
        content: 'Third message',
      };
      const stateWithMessages = {
        ...initialState,
        messages: [mockMessage, mockAssistantMessage],
      };
      const action: BrandChatAction = {
        type: 'ADD_MESSAGE',
        payload: message3,
      };

      const newState = brandChatReducer(stateWithMessages, action);

      expect(newState.messages[0]).toBe(mockMessage);
      expect(newState.messages[1]).toBe(mockAssistantMessage);
      expect(newState.messages[2]).toBe(message3);
    });
  });

  describe('SET_MESSAGES', () => {
    it('replaces all messages', () => {
      const existingState = {
        ...initialState,
        messages: [mockMessage],
      };
      const newMessages = [mockAssistantMessage];
      const action: BrandChatAction = {
        type: 'SET_MESSAGES',
        payload: newMessages,
      };

      const newState = brandChatReducer(existingState, action);

      expect(newState.messages).toEqual(newMessages);
      expect(newState.messages).toHaveLength(1);
    });

    it('sets empty array', () => {
      const stateWithMessages = {
        ...initialState,
        messages: [mockMessage, mockAssistantMessage],
      };
      const action: BrandChatAction = {
        type: 'SET_MESSAGES',
        payload: [],
      };

      const newState = brandChatReducer(stateWithMessages, action);

      expect(newState.messages).toEqual([]);
      expect(newState.messages).toHaveLength(0);
    });

    it('sets multiple messages', () => {
      const messages = [mockMessage, mockAssistantMessage];
      const action: BrandChatAction = {
        type: 'SET_MESSAGES',
        payload: messages,
      };

      const newState = brandChatReducer(initialState, action);

      expect(newState.messages).toEqual(messages);
    });
  });

  describe('UPDATE_LAST_ASSISTANT_MESSAGE', () => {
    it('updates the last assistant message content', () => {
      const stateWithAssistantMessage = {
        ...initialState,
        messages: [mockMessage, mockAssistantMessage],
      };
      const action: BrandChatAction = {
        type: 'UPDATE_LAST_ASSISTANT_MESSAGE',
        payload: 'Updated content',
      };

      const newState = brandChatReducer(stateWithAssistantMessage, action);

      expect(newState.messages[0]).toBe(mockMessage); // unchanged
      expect(newState.messages[1]).toEqual({
        ...mockAssistantMessage,
        content: 'Updated content',
      });
    });

    it('only updates last message if it is assistant role', () => {
      const userMessage: ChatMessage = {
        id: 'msg-3',
        role: 'user',
        content: 'Last user message',
      };
      const stateWithUserAsLast = {
        ...initialState,
        messages: [mockAssistantMessage, userMessage],
      };
      const action: BrandChatAction = {
        type: 'UPDATE_LAST_ASSISTANT_MESSAGE',
        payload: 'Updated content',
      };

      const newState = brandChatReducer(stateWithUserAsLast, action);

      // Should not change anything since last message is user role
      expect(newState.messages).toEqual(stateWithUserAsLast.messages);
      expect(newState.messages[1].content).toBe('Last user message');
    });

    it('handles empty messages array', () => {
      const action: BrandChatAction = {
        type: 'UPDATE_LAST_ASSISTANT_MESSAGE',
        payload: 'Updated content',
      };

      const newState = brandChatReducer(initialState, action);

      expect(newState.messages).toEqual([]);
    });

    it('preserves other message properties', () => {
      const assistantMessage: ChatMessage = {
        id: 'msg-assistant',
        role: 'assistant',
        content: 'Original content',
      };
      const stateWithMessage = {
        ...initialState,
        messages: [assistantMessage],
      };
      const action: BrandChatAction = {
        type: 'UPDATE_LAST_ASSISTANT_MESSAGE',
        payload: 'New content',
      };

      const newState = brandChatReducer(stateWithMessage, action);

      expect(newState.messages[0].id).toBe('msg-assistant');
      expect(newState.messages[0].role).toBe('assistant');
      expect(newState.messages[0].content).toBe('New content');
    });
  });

  describe('REMOVE_LAST_MESSAGE', () => {
    it('removes last assistant message with empty content', () => {
      const emptyAssistantMessage: ChatMessage = {
        id: 'msg-empty',
        role: 'assistant',
        content: '',
      };
      const stateWithEmptyAssistant = {
        ...initialState,
        messages: [mockMessage, emptyAssistantMessage],
      };
      const action: BrandChatAction = { type: 'REMOVE_LAST_MESSAGE' };

      const newState = brandChatReducer(stateWithEmptyAssistant, action);

      expect(newState.messages).toEqual([mockMessage]);
      expect(newState.messages).toHaveLength(1);
    });

    it('does not remove assistant message with content', () => {
      const stateWithAssistant = {
        ...initialState,
        messages: [mockMessage, mockAssistantMessage],
      };
      const action: BrandChatAction = { type: 'REMOVE_LAST_MESSAGE' };

      const newState = brandChatReducer(stateWithAssistant, action);

      expect(newState.messages).toEqual([mockMessage, mockAssistantMessage]);
    });

    it('does not remove user message', () => {
      const stateWithUserLast = {
        ...initialState,
        messages: [mockAssistantMessage, mockMessage],
      };
      const action: BrandChatAction = { type: 'REMOVE_LAST_MESSAGE' };

      const newState = brandChatReducer(stateWithUserLast, action);

      expect(newState.messages).toEqual([mockAssistantMessage, mockMessage]);
    });

    it('handles empty messages array', () => {
      const action: BrandChatAction = { type: 'REMOVE_LAST_MESSAGE' };

      const newState = brandChatReducer(initialState, action);

      expect(newState.messages).toEqual([]);
    });
  });

  describe('SET_LOADING', () => {
    it('sets loading to true', () => {
      const action: BrandChatAction = {
        type: 'SET_LOADING',
        payload: true,
      };

      const newState = brandChatReducer(initialState, action);

      expect(newState.isLoading).toBe(true);
      expect(newState).toEqual({
        ...initialState,
        isLoading: true,
      });
    });

    it('sets loading to false', () => {
      const stateWithLoading = { ...initialState, isLoading: true };
      const action: BrandChatAction = {
        type: 'SET_LOADING',
        payload: false,
      };

      const newState = brandChatReducer(stateWithLoading, action);

      expect(newState.isLoading).toBe(false);
    });
  });

  describe('SET_ERROR', () => {
    it('sets error', () => {
      const error = new Error('Test error');
      const action: BrandChatAction = {
        type: 'SET_ERROR',
        payload: error,
      };

      const newState = brandChatReducer(initialState, action);

      expect(newState.error).toBe(error);
      expect(newState).toEqual({
        ...initialState,
        error,
      });
    });

    it('clears error', () => {
      const error = new Error('Test error');
      const stateWithError = { ...initialState, error };
      const action: BrandChatAction = {
        type: 'SET_ERROR',
        payload: null,
      };

      const newState = brandChatReducer(stateWithError, action);

      expect(newState.error).toBeNull();
    });

    it('replaces existing error', () => {
      const oldError = new Error('Old error');
      const newError = new Error('New error');
      const stateWithError = { ...initialState, error: oldError };
      const action: BrandChatAction = {
        type: 'SET_ERROR',
        payload: newError,
      };

      const newState = brandChatReducer(stateWithError, action);

      expect(newState.error).toBe(newError);
    });
  });

  describe('CLEAR_MESSAGES', () => {
    it('clears all messages', () => {
      const stateWithMessages = {
        ...initialState,
        messages: [mockMessage, mockAssistantMessage],
      };
      const action: BrandChatAction = { type: 'CLEAR_MESSAGES' };

      const newState = brandChatReducer(stateWithMessages, action);

      expect(newState.messages).toEqual([]);
      expect(newState.messages).toHaveLength(0);
    });

    it('clears error along with messages', () => {
      const error = new Error('Test error');
      const stateWithMessagesAndError = {
        ...initialState,
        messages: [mockMessage],
        error,
      };
      const action: BrandChatAction = { type: 'CLEAR_MESSAGES' };

      const newState = brandChatReducer(stateWithMessagesAndError, action);

      expect(newState.messages).toEqual([]);
      expect(newState.error).toBeNull();
    });

    it('preserves other state properties', () => {
      const stateWithData = {
        ...initialState,
        messages: [mockMessage],
        input: 'test input',
        isLoading: true,
      };
      const action: BrandChatAction = { type: 'CLEAR_MESSAGES' };

      const newState = brandChatReducer(stateWithData, action);

      expect(newState.messages).toEqual([]);
      expect(newState.error).toBeNull();
      expect(newState.input).toBe('test input'); // preserved
      expect(newState.isLoading).toBe(true); // preserved
    });
  });

  describe('RESET', () => {
    it('resets messages to provided payload', () => {
      const currentMessages = [mockMessage, mockAssistantMessage];
      const newMessages = [mockAssistantMessage];
      const stateWithData = {
        ...initialState,
        messages: currentMessages,
        input: 'test input',
        isLoading: true,
        error: new Error('Test error'),
      };
      const action: BrandChatAction = {
        type: 'RESET',
        payload: { messages: newMessages },
      };

      const newState = brandChatReducer(stateWithData, action);

      expect(newState.messages).toEqual(newMessages);
      expect(newState.error).toBeNull();
      expect(newState.input).toBe('test input'); // preserved
      expect(newState.isLoading).toBe(true); // preserved
    });

    it('resets to empty messages', () => {
      const stateWithMessages = {
        ...initialState,
        messages: [mockMessage],
        error: new Error('Test error'),
      };
      const action: BrandChatAction = {
        type: 'RESET',
        payload: { messages: [] },
      };

      const newState = brandChatReducer(stateWithMessages, action);

      expect(newState.messages).toEqual([]);
      expect(newState.error).toBeNull();
    });

    it('clears error on reset', () => {
      const error = new Error('Test error');
      const stateWithError = {
        ...initialState,
        error,
      };
      const action: BrandChatAction = {
        type: 'RESET',
        payload: { messages: [mockMessage] },
      };

      const newState = brandChatReducer(stateWithError, action);

      expect(newState.error).toBeNull();
      expect(newState.messages).toEqual([mockMessage]);
    });
  });

  describe('default case', () => {
    it('returns state unchanged for unknown action', () => {
      // @ts-expect-error - intentionally testing unknown action
      const unknownAction = { type: 'UNKNOWN_ACTION' };

      const newState = brandChatReducer(initialState, unknownAction);

      expect(newState).toBe(initialState);
      expect(newState).toEqual(initialState);
    });
  });
});

describe('createInitialBrandChatState', () => {
  it('creates initial state with empty messages by default', () => {
    const state = createInitialBrandChatState();

    expect(state).toEqual({
      messages: [],
      input: '',
      isLoading: false,
      error: null,
    });
  });

  it('creates initial state with provided messages', () => {
    const messages = [mockMessage, mockAssistantMessage];
    const state = createInitialBrandChatState(messages);

    expect(state).toEqual({
      messages,
      input: '',
      isLoading: false,
      error: null,
    });
  });

  it('handles empty array explicitly', () => {
    const state = createInitialBrandChatState([]);

    expect(state.messages).toEqual([]);
    expect(state.messages).toHaveLength(0);
  });

  it('preserves message references', () => {
    const messages = [mockMessage];
    const state = createInitialBrandChatState(messages);

    expect(state.messages[0]).toBe(mockMessage);
  });

  const mockMessage: ChatMessage = {
    id: 'msg-1',
    role: 'user',
    content: 'Hello world',
  };

  const mockAssistantMessage: ChatMessage = {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hello! How can I help?',
  };
});
