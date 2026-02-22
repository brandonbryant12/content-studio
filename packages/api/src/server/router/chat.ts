import {
  streamResearchChat,
  synthesizeResearchQuery,
  streamPersonaChat,
  synthesizePersona,
  streamWritingAssistantChat,
} from '@repo/ai/chat';
import {
  handleEffectWithProtocol,
  handleEffectStreamWithProtocol,
} from '../effect-handler';
import { protectedProcedure } from '../orpc';

const chatRouter = {
  research: protectedProcedure.chat.research.handler(
    async ({ context, input, errors }) =>
      handleEffectStreamWithProtocol(
        context.runtime,
        context.user,
        streamResearchChat({ messages: input.messages }),
        errors,
        { span: 'api.chat.research' },
      ),
  ),

  synthesizeResearchQuery:
    protectedProcedure.chat.synthesizeResearchQuery.handler(
      async ({ context, input, errors }) =>
        handleEffectWithProtocol(
          context.runtime,
          context.user,
          synthesizeResearchQuery({ messages: input.messages }),
          errors,
          { span: 'api.chat.synthesizeResearchQuery' },
        ),
    ),

  personaChat: protectedProcedure.chat.personaChat.handler(
    async ({ context, input, errors }) =>
      handleEffectStreamWithProtocol(
        context.runtime,
        context.user,
        streamPersonaChat({ messages: input.messages }),
        errors,
        { span: 'api.chat.personaChat' },
      ),
  ),

  writingAssistant: protectedProcedure.chat.writingAssistant.handler(
    async ({ context, input, errors }) =>
      handleEffectStreamWithProtocol(
        context.runtime,
        context.user,
        streamWritingAssistantChat({ messages: input.messages }),
        errors,
        { span: 'api.chat.writingAssistant' },
      ),
  ),

  synthesizePersona: protectedProcedure.chat.synthesizePersona.handler(
    async ({ context, input, errors }) =>
      handleEffectWithProtocol(
        context.runtime,
        context.user,
        synthesizePersona({ messages: input.messages }),
        errors,
        { span: 'api.chat.synthesizePersona' },
      ),
  ),
};

export default chatRouter;
