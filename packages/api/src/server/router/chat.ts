import {
  streamResearchChat,
  synthesizeResearchQuery,
  streamPersonaChat,
  synthesizePersona,
  streamWritingAssistantChat,
} from '@repo/ai/chat';
import { bindEffectProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const chatRouter = {
  research: protectedProcedure.chat.research.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).stream(
        streamResearchChat({ messages: input.messages }),
      ),
  ),

  synthesizeResearchQuery:
    protectedProcedure.chat.synthesizeResearchQuery.handler(
      async ({ context, input, errors }) =>
        bindEffectProtocol({ context, errors }).run(
          synthesizeResearchQuery({ messages: input.messages }),
        ),
    ),

  personaChat: protectedProcedure.chat.personaChat.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).stream(
        streamPersonaChat({ messages: input.messages }),
      ),
  ),

  writingAssistant: protectedProcedure.chat.writingAssistant.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).stream(
        streamWritingAssistantChat({
          messages: input.messages,
          transcript: input.transcript,
        }),
      ),
  ),

  synthesizePersona: protectedProcedure.chat.synthesizePersona.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        synthesizePersona({ messages: input.messages }),
      ),
  ),
};

export default chatRouter;
