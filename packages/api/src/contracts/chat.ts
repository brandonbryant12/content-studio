import { oc, eventIterator, type } from '@orpc/contract';
import type { UIMessage } from 'ai';

const chatContract = oc
  .prefix('/chat')
  .tag('chat')
  .router({
    research: oc
      .route({ method: 'POST', path: '/research' })
      .input(type<{ messages: UIMessage[] }>())
      .output(eventIterator(type<unknown>())),
  });

export default chatContract;
