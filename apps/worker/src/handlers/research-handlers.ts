import { processResearch } from '@repo/media/source';
import type { ProcessResearchPayload } from '@repo/queue';
import { defineJobHandler } from './job-handler';

export const handleProcessResearch = defineJobHandler<ProcessResearchPayload>()(
  {
    span: 'worker.handleProcessResearch',
    errorMessage: 'Failed to process research',
    attributes: (job) => ({
      'source.id': job.payload.sourceId,
    }),
    run: (job) =>
      processResearch({
        sourceId: job.payload.sourceId,
        query: job.payload.query,
      }),
  },
);
