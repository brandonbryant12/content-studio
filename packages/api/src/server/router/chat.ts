import { streamToEventIterator } from '@orpc/server';
import {
  streamResearchChat,
  synthesizeResearchQuery,
  streamPersonaChat,
  synthesizePersona,
} from '@repo/ai/chat';
import { protectedProcedure } from '../orpc';

const chatRouter = {
  research: protectedProcedure.chat.research.handler(
    async ({ context, input }) => {
      const stream = await context.runtime.runPromise(
        streamResearchChat({ messages: input.messages }),
      );
      return streamToEventIterator(stream);
    },
  ),

  synthesizeResearchQuery:
    protectedProcedure.chat.synthesizeResearchQuery.handler(
      async ({ context, input }) => {
        return context.runtime.runPromise(
          synthesizeResearchQuery({ messages: input.messages }),
        );
      },
    ),

  personaChat: protectedProcedure.chat.personaChat.handler(
    async ({ context, input }) => {
      const stream = await context.runtime.runPromise(
        streamPersonaChat({ messages: input.messages }),
      );
      return streamToEventIterator(stream);
    },
  ),

  synthesizePersona: protectedProcedure.chat.synthesizePersona.handler(
    async ({ context, input }) => {
      return context.runtime.runPromise(
        synthesizePersona({ messages: input.messages }),
      );
    },
  ),
};

export default chatRouter;
