import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { trustedOrigins } from '../config';
import { env } from '../env';
import { auth, sseManager } from '../services';

const SSE_HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * SSE events route for real-time updates.
 * Clients subscribe to receive job completion and entity change events.
 */
export const eventsRoute = new Hono()
  .use(
    cors({
      origin: trustedOrigins,
      credentials: true,
    }),
  )
  .get('/', async (c) => {
    // Verify session
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.text('Unauthorized', 401);
    }

    return streamSSE(c, async (stream) => {
      // Send connection confirmation
      await stream.writeSSE({
        data: JSON.stringify({ type: 'connected', userId: session.user.id }),
      });

      // Subscribe to SSE events for this user
      const unsubscribe = sseManager.subscribe(session.user.id, {
        write: async (data: Uint8Array) => {
          const text = new TextDecoder().decode(data);
          // Extract JSON from "data: {...}\n\n" format
          const match = text.match(/^data: (.+)\n\n$/);
          if (match?.[1]) {
            await stream.writeSSE({ data: match[1] });
          }
        },
      });

      // Send heartbeat to keep connection alive
      const heartbeat = setInterval(async () => {
        try {
          await stream.writeSSE({ data: ':heartbeat' });
        } catch {
          // Stream closed, cleanup will happen on abort
        }
      }, SSE_HEARTBEAT_INTERVAL_MS);

      // Cleanup on disconnect
      stream.onAbort(() => {
        clearInterval(heartbeat);
        unsubscribe();
      });

      // Keep the stream open
      while (true) {
        await stream.sleep(60_000);
      }
    });
  });

export const eventsPath = `${env.PUBLIC_SERVER_API_PATH}/events`;
