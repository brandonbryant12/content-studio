import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { storageConfig } from '../services';

/**
 * Static file serving for filesystem storage provider.
 * Only mounted when STORAGE_PROVIDER=filesystem.
 */
export const staticRoute = new Hono();

if (storageConfig.provider === 'filesystem') {
  staticRoute.use(
    '/*',
    serveStatic({
      root: storageConfig.basePath,
      rewriteRequestPath: (path) => path.replace('/storage', ''),
    }),
  );
}

export const staticPath = '/storage';
