import { processUrl } from '@repo/media/source';
import type { ProcessUrlPayload } from '@repo/queue';
import { defineJobHandler } from './job-handler';

export const handleProcessUrl = defineJobHandler<ProcessUrlPayload>()({
  span: 'worker.handleProcessUrl',
  errorMessage: 'Failed to process URL',
  attributes: (job) => ({
    'source.id': job.payload.sourceId,
    'source.url': job.payload.url,
  }),
  run: (job) =>
    processUrl({
      sourceId: job.payload.sourceId,
      url: job.payload.url,
    }),
});
