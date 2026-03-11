import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { requestIdMiddleware } from '../middleware/request-id';
import { apiBodyLimit, API_BODY_LIMIT_BYTES } from '../routes/api-body-limit';

const createApp = () => {
  const app = new Hono<{ Variables: { requestId: string } }>();
  app.use(requestIdMiddleware);
  app.use('/api/*', apiBodyLimit);
  app.post('/api/sources/upload', async (c) => {
    await c.req.json();
    return c.json({ ok: true });
  });
  return app;
};

describe('api body limit', () => {
  it('rejects oversized payloads with 413', async () => {
    const app = createApp();
    const oversizedData = 'a'.repeat(API_BODY_LIMIT_BYTES + 1024);
    const body = JSON.stringify({
      fileName: 'large.txt',
      mimeType: 'text/plain',
      data: oversizedData,
    });
    const request = new Request('http://localhost/api/sources/upload', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': String(Buffer.byteLength(body)),
        'x-request-id': 'req-payload-too-large',
      },
      body,
    });
    const res = await app.request(request);

    expect(res.status).toBe(413);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    expect(res.headers.get('X-Request-Id')).toBe('req-payload-too-large');
    await expect(res.json()).resolves.toEqual({
      type: 'https://content-studio.dev/problems/payload-too-large',
      title: 'Payload Too Large',
      status: 413,
      detail: 'Request body exceeds the 16 MB limit.',
      code: 'PAYLOAD_TOO_LARGE',
      requestId: 'req-payload-too-large',
    });
  });

  it('allows non-oversized payloads to reach normal handler flow', async () => {
    const app = createApp();
    const res = await app.request('/api/sources/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fileName: 'small.txt',
        mimeType: 'text/plain',
        data: Buffer.from('hello', 'utf-8').toString('base64'),
      }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
