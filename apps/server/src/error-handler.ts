import { HTTPException } from 'hono/http-exception';
import type { ErrorHandler } from 'hono';
import {
  createProblemResponse,
  withRequestIdHeader,
} from './problem-response';

export const globalErrorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    // Preserve explicit framework-level HTTP responses (status/body/headers).
    return withRequestIdHeader(c, err.getResponse());
  }

  console.error('\t[ERROR]', err.stack || err.message || err);
  return createProblemResponse(c, {
    status: 500,
    title: 'Internal Server Error',
    detail: 'An internal error occurred. Please try again later.',
    code: 'INTERNAL_ERROR',
  });
};
