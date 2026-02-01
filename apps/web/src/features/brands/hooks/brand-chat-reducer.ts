// features/brands/hooks/brand-chat-reducer.ts
// Reducer for brand chat state management

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface BrandChatState {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  error: Error | null;
}

export type BrandChatAction =
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'UPDATE_LAST_ASSISTANT_MESSAGE'; payload: string }
  | { type: 'REMOVE_LAST_MESSAGE' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'CLEAR_INPUT' }
  | { type: 'RESET'; payload: { messages: ChatMessage[] } };

export function brandChatReducer(
  state: BrandChatState,
  action: BrandChatAction,
): BrandChatState {
  switch (action.type) {
    case 'SET_INPUT':
      return {
        ...state,
        input: action.payload,
      };

    case 'CLEAR_INPUT':
      return {
        ...state,
        input: '',
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
      };

    case 'UPDATE_LAST_ASSISTANT_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((message, index) => {
          if (
            index === state.messages.length - 1 &&
            message.role === 'assistant'
          ) {
            return {
              ...message,
              content: action.payload,
            };
          }
          return message;
        }),
      };

    case 'REMOVE_LAST_MESSAGE':
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage?.role === 'assistant' && !lastMessage.content) {
        return {
          ...state,
          messages: state.messages.slice(0, -1),
        };
      }
      return state;

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
        error: null,
      };

    case 'RESET':
      return {
        ...state,
        messages: action.payload.messages,
        error: null,
      };

    default:
      return state;
  }
}

export function createInitialBrandChatState(
  initialMessages: ChatMessage[] = [],
): BrandChatState {
  return {
    messages: initialMessages,
    input: '',
    isLoading: false,
    error: null,
  };
}
