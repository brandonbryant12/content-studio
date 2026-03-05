import { bodyLimit } from 'hono/body-limit';

export const API_BODY_LIMIT_BYTES = 16 * 1024 * 1024;

export const apiBodyLimit = bodyLimit({
  maxSize: API_BODY_LIMIT_BYTES,
  onError: (c) => c.json({ error: 'Payload too large' }, 413),
});
