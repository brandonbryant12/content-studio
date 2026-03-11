import { bodyLimit } from 'hono/body-limit';
import { createProblemResponse } from '../problem-response';

export const API_BODY_LIMIT_BYTES = 16 * 1024 * 1024;

export const apiBodyLimit = bodyLimit({
  maxSize: API_BODY_LIMIT_BYTES,
  onError: (c) =>
    createProblemResponse(c, {
      status: 413,
      title: 'Payload Too Large',
      detail: 'Request body exceeds the 16 MB limit.',
      code: 'PAYLOAD_TOO_LARGE',
    }),
});
