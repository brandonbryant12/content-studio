import { streamToEventIterator } from '@orpc/server';
import { streamResearchChat, synthesizeResearchQuery } from '@repo/ai/chat';
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
};

export default chatRouter;
