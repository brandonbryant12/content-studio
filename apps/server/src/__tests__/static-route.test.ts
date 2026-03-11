import { Buffer } from 'node:buffer';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runPromiseExitMock } = vi.hoisted(() => ({
  runPromiseExitMock: vi.fn(),
}));

vi.mock('../config', () => ({
  bearerCorsPolicy: {
    origin: ['http://localhost:8086'],
    credentials: false,
  },
}));

vi.mock('../services', () => ({
  serverRuntime: {
    runPromiseExit: runPromiseExitMock,
  },
  storageAccessProxy: {
    enabled: false,
    verifyToken: vi.fn(),
  },
}));

import { staticPath, staticRoute } from '../routes/static';

describe('staticRoute', () => {
  beforeEach(() => {
    runPromiseExitMock.mockReset();
  });

  it('allows cross-origin storage downloads for the web app', async () => {
    runPromiseExitMock.mockResolvedValue({
      _tag: 'Success',
      value: Buffer.from('RIFF'),
    });

    const app = new Hono().route(staticPath, staticRoute);
    const response = await app.request(
      'http://localhost/storage/voiceovers/vo_1/audio.wav',
      {
        headers: {
          origin: 'http://localhost:8086',
        },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('RIFF');
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:8086',
    );
    expect(response.headers.get('content-type')).toBe('audio/wav');
  });
});
