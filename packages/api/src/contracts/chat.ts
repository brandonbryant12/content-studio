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

    synthesizeResearchQuery: oc
      .route({ method: 'POST', path: '/synthesize-research-query' })
      .input(type<{ messages: UIMessage[] }>())
      .output(type<{ query: string; title: string }>()),
  });

export default chatContract;
