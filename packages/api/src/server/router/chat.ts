import { streamToEventIterator } from '@orpc/server';
import { streamResearchChat } from '@repo/ai/chat';
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
};

export default chatRouter;
