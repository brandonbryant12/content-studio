import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const globalErrorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    // Preserve explicit framework-level HTTP responses (status/body/headers).
    return err.getResponse();
  }

  console.error('\t[ERROR]', err.stack || err.message || err);
  return c.json({ error: 'Internal Server Error' }, 500);
};
