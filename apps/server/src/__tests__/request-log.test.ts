import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { requestLog } from '../middleware/request-log';

describe('requestLog', () => {
  it('omits query strings from request logs', async () => {
    const log = vi.fn();
    const app = new Hono();

    app.use(requestLog(log));
    app.get('/storage/file.png', (c) => c.text('ok'));

    await app.request('http://localhost/storage/file.png?token=secret-value');

    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0]?.[0]).toBe('<-- GET /storage/file.png');
    expect(log.mock.calls[1]?.[0]).toMatch(
      /^--> GET \/storage\/file\.png 200 \d+(ms|s)$/,
    );
    expect(log.mock.calls[0]?.[0]).not.toContain('token=');
    expect(log.mock.calls[1]?.[0]).not.toContain('token=');
  });
});
