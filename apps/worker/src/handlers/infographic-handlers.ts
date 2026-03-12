import { executeInfographicGeneration } from '@repo/media/infographic';
import type { GenerateInfographicPayload } from '@repo/queue';
import { defineJobHandler } from './job-handler';

export const handleGenerateInfographic =
  defineJobHandler<GenerateInfographicPayload>()({
    span: 'worker.handleGenerateInfographic',
    errorMessage: 'Failed to generate infographic',
    attributes: (job) => ({
      'infographic.id': job.payload.infographicId,
    }),
    run: (job) =>
      executeInfographicGeneration({
        infographicId: job.payload.infographicId,
      }),
  });
