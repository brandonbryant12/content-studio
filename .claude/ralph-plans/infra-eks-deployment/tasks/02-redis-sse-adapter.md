# Task 02: Add Redis Pub/Sub for SSE Scaling

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/use-case.md` - Effect TS patterns
- [ ] `standards/patterns/repository.md` - Data access patterns

## Context

The current `SSEManager` at `apps/server/src/sse/sse-manager.ts` uses an in-process EventEmitter. This works for single-instance deployments but breaks when scaling to multiple server replicas - events emitted on one instance won't reach connections on other instances.

For EKS deployment with HPA, we need events to propagate across all server instances. Redis Pub/Sub is the standard solution for this.

Current SSE architecture:
- `sseManager.emit(userId, event)` - Send to specific user's connections
- `sseManager.broadcast(event)` - Send to all connected users
- `sseManager.subscribe(userId, res)` - Register a connection
- Workers call `sseManager.emit()` when jobs complete

## Key Files

- `apps/server/src/sse/sse-manager.ts` - Current implementation (refactor)
- `apps/server/src/sse/adapters/memory-adapter.ts` - NEW: Extract current logic
- `apps/server/src/sse/adapters/redis-adapter.ts` - NEW: Redis implementation
- `apps/server/src/sse/adapters/types.ts` - NEW: Adapter interface
- `apps/server/src/env.ts` - Add Redis configuration
- `packages/package.json` or appropriate package - Add ioredis dependency

## Implementation Steps

### 2.1 Define Adapter Interface

Create `apps/server/src/sse/adapters/types.ts`:

```typescript
export interface SSEAdapter {
  // Publish an event (goes to Redis or stays local)
  publish(channel: string, event: SSEEvent): Promise<void>;

  // Subscribe to events from other instances
  subscribe(channel: string, handler: (event: SSEEvent) => void): Promise<void>;

  // Cleanup
  disconnect(): Promise<void>;
}

export interface SSEEvent {
  type: string;
  userId?: string;  // undefined = broadcast
  data: unknown;
}
```

### 2.2 Extract Memory Adapter

Create `apps/server/src/sse/adapters/memory-adapter.ts`:
- Move current EventEmitter logic here
- Implement SSEAdapter interface
- publish() emits locally
- subscribe() listens locally
- No-op for disconnect()

### 2.3 Create Redis Adapter

Create `apps/server/src/sse/adapters/redis-adapter.ts`:

```typescript
import Redis from 'ioredis';

export class RedisSSEAdapter implements SSEAdapter {
  private publisher: Redis;
  private subscriber: Redis;
  private channel = 'content-studio:sse';

  constructor(redisUrl: string) {
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
  }

  async publish(channel: string, event: SSEEvent): Promise<void> {
    await this.publisher.publish(
      this.channel,
      JSON.stringify({ channel, event })
    );
  }

  async subscribe(channel: string, handler: (event: SSEEvent) => void): Promise<void> {
    await this.subscriber.subscribe(this.channel);
    this.subscriber.on('message', (ch, message) => {
      const { channel: eventChannel, event } = JSON.parse(message);
      if (eventChannel === channel || channel === '*') {
        handler(event);
      }
    });
  }

  async disconnect(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
  }
}
```

### 2.4 Refactor SSEManager

Update `apps/server/src/sse/sse-manager.ts`:

```typescript
export class SSEManager {
  private connections: Map<string, Set<Response>>;
  private adapter: SSEAdapter;

  constructor(adapter: SSEAdapter) {
    this.connections = new Map();
    this.adapter = adapter;

    // Listen for events from adapter (other instances)
    this.adapter.subscribe('*', (event) => {
      this.deliverLocally(event);
    });
  }

  async emit(userId: string, event: SSEEvent): Promise<void> {
    // Publish to adapter (Redis broadcasts to all instances)
    await this.adapter.publish(`user:${userId}`, { ...event, userId });
  }

  async broadcast(event: SSEEvent): Promise<void> {
    await this.adapter.publish('broadcast', event);
  }

  private deliverLocally(event: SSEEvent): void {
    // Deliver to connections on THIS instance only
    if (event.userId) {
      const userConnections = this.connections.get(event.userId);
      userConnections?.forEach(res => this.sendToConnection(res, event));
    } else {
      // Broadcast to all local connections
      this.connections.forEach(conns =>
        conns.forEach(res => this.sendToConnection(res, event))
      );
    }
  }
}
```

### 2.5 Update Environment Configuration

Add to `apps/server/src/env.ts`:

```typescript
SSE_ADAPTER: Schema.optional(
  Schema.Literal('memory', 'redis')
).pipe(Schema.withDefault(() => 'memory')),

REDIS_URL: Schema.optional(Schema.String),
```

Validation: If SSE_ADAPTER=redis, REDIS_URL is required.

### 2.6 Factory Function for SSEManager

Create initialization logic:

```typescript
export const createSSEManager = (env: Env): SSEManager => {
  const adapter = env.SSE_ADAPTER === 'redis'
    ? new RedisSSEAdapter(env.REDIS_URL!)
    : new MemorySSEAdapter();

  return new SSEManager(adapter);
};
```

### 2.7 Write Integration Tests

Create test that:
1. Starts two SSEManager instances with Redis adapter
2. Connects a client to instance A
3. Emits event from instance B
4. Verifies client on instance A receives event

Use testcontainers or mock Redis for testing.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SSE_ADAPTER` | No | `memory` | SSE adapter type: `memory` or `redis` |
| `REDIS_URL` | If redis | - | Redis connection URL (e.g., `redis://localhost:6379`) |

## Verification Log

<!-- Agent writes verification results here -->
