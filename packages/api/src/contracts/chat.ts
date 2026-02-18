import { oc, eventIterator, type } from '@orpc/contract';
import type { UIMessage, UIMessageChunk } from 'ai';

const ChatMessagesInput = type<{ messages: UIMessage[] }>();
const ChatStreamOutput = eventIterator(type<UIMessageChunk>());

const chatContract = oc
  .prefix('/chat')
  .tag('chat')
  .router({
    research: oc
      .route({ method: 'POST', path: '/research' })
      .input(ChatMessagesInput)
      .output(ChatStreamOutput),

    synthesizeResearchQuery: oc
      .route({ method: 'POST', path: '/synthesize-research-query' })
      .input(ChatMessagesInput)
      .output(type<{ query: string; title: string }>()),

    personaChat: oc
      .route({ method: 'POST', path: '/persona-chat' })
      .input(ChatMessagesInput)
      .output(ChatStreamOutput),

    writingAssistant: oc
      .route({ method: 'POST', path: '/writing-assistant' })
      .input(ChatMessagesInput)
      .output(ChatStreamOutput),

    synthesizePersona: oc
      .route({ method: 'POST', path: '/synthesize-persona' })
      .input(ChatMessagesInput)
      .output(
        type<{
          name: string;
          role: string;
          personalityDescription: string;
          speakingStyle: string;
          exampleQuotes: readonly string[];
          voiceId: string;
          voiceName: string;
        }>(),
      ),
  });

export default chatContract;
