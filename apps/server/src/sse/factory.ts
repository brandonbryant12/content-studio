import { env } from '../env';
import { MemorySSEAdapter, RedisSSEAdapter } from './adapters';
import { SSEManager } from './sse-manager';

/**
 * Create and initialize an SSEManager based on environment configuration.
 *
 * Environment variables:
 * - SSE_ADAPTER: 'memory' (default) or 'redis'
 * - REDIS_URL: Required when SSE_ADAPTER=redis (e.g., redis://localhost:6379)
 *
 * @returns Initialized SSEManager instance
 * @throws Error if SSE_ADAPTER=redis but REDIS_URL is not set
 */
export async function createSSEManager(): Promise<SSEManager> {
  const adapterType = env.SSE_ADAPTER;

  let manager: SSEManager;

  if (adapterType === 'redis') {
    if (!env.REDIS_URL) {
      throw new Error('REDIS_URL is required when SSE_ADAPTER=redis');
    }
    const adapter = new RedisSSEAdapter(env.REDIS_URL);
    manager = new SSEManager(adapter);
    console.log(
      '[SSE] Using Redis adapter for multi-instance event distribution',
    );
  } else {
    const adapter = new MemorySSEAdapter();
    manager = new SSEManager(adapter);
    console.log('[SSE] Using Memory adapter (single-instance mode)');
  }

  await manager.initialize();
  return manager;
}
