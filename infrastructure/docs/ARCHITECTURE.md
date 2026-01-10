# Content Studio Architecture

## System Overview

Content Studio is an AI-powered podcast generation platform deployed on Kubernetes.

```
                                    ┌─────────────────────────────────────────────────────────┐
                                    │                    Kubernetes Cluster                    │
                                    │                                                          │
    ┌─────────┐                     │   ┌─────────────────────────────────────────────────┐   │
    │         │   HTTP/HTTPS        │   │              Ingress Controller                 │   │
    │  Users  │────────────────────►│   │         (nginx local / ALB on EKS)              │   │
    │         │                     │   └─────────────────────────────────────────────────┘   │
    └─────────┘                     │              │                      │                   │
                                    │              │ /api/*               │ /*                │
                                    │              ▼                      ▼                   │
                                    │   ┌──────────────────┐   ┌──────────────────┐          │
                                    │   │                  │   │                  │          │
                                    │   │  Server (API)    │   │   Web (Frontend) │          │
                                    │   │  ┌────────────┐  │   │  ┌────────────┐  │          │
                                    │   │  │ Hono API   │  │   │  │ Vite/React │  │          │
                                    │   │  │ Effect TS  │  │   │  │ TanStack   │  │          │
                                    │   │  │ SSE        │  │   │  └────────────┘  │          │
                                    │   │  └────────────┘  │   │                  │          │
                                    │   │                  │   │                  │          │
                                    │   └────────┬─────────┘   └──────────────────┘          │
                                    │            │                                            │
                                    │            │ Redis Pub/Sub (SSE scaling)               │
                                    │            ▼                                            │
                                    │   ┌──────────────────┐                                  │
                                    │   │                  │                                  │
                                    │   │      Redis       │◄─────────────────────┐          │
                                    │   │                  │                      │          │
                                    │   └──────────────────┘                      │          │
                                    │                                              │          │
                                    │   ┌──────────────────┐                      │          │
                                    │   │                  │                      │          │
                                    │   │  Worker (Jobs)   │──────────────────────┘          │
                                    │   │  ┌────────────┐  │                                  │
                                    │   │  │ Effect TS  │  │                                  │
                                    │   │  │ AI/Gemini  │  │                                  │
                                    │   │  └────────────┘  │                                  │
                                    │   │                  │                                  │
                                    │   └────────┬─────────┘                                  │
                                    │            │                                            │
                                    └────────────┼────────────────────────────────────────────┘
                                                 │
                                                 ▼
                                    ┌──────────────────────┐
                                    │     PostgreSQL       │
                                    │   (External - RDS)   │
                                    └──────────────────────┘
```

## Components

### Server (API Backend)

- **Image**: `content-studio-server`
- **Port**: 3000
- **Mode**: `--mode=server`
- **Purpose**: HTTP API, Server-Sent Events (SSE) for real-time updates

The server handles all API requests from the frontend, including:
- Authentication and session management
- CRUD operations for podcasts, episodes, content
- SSE connections for real-time job progress updates

### Worker (Background Jobs)

- **Image**: Same as server (`content-studio-server`)
- **Mode**: `--mode=worker`
- **Purpose**: Process AI generation jobs asynchronously

Workers poll for pending jobs and process AI-powered content generation:
- Script generation via Google Gemini
- Audio synthesis
- Content processing pipelines

### Web (Frontend)

- **Image**: `content-studio-web`
- **Port**: 80 (nginx serving static assets)
- **Purpose**: React SPA for user interface

The frontend is a static build served by nginx:
- React with TanStack Router for client-side routing
- TanStack Query for server state management
- TanStack Form for form handling
- Tailwind CSS for styling

### Redis

- **Purpose**: SSE scaling via pub/sub, optional job queue
- **Deployment**: Bitnami Redis subchart or external

Redis enables horizontal scaling of SSE connections. When a worker completes a job, it publishes an event that all server instances receive, ensuring connected clients get real-time updates regardless of which server instance they're connected to.

### PostgreSQL

- **Deployment**: External (AWS RDS in production)
- **ORM**: Drizzle ORM
- **Purpose**: Primary data store

## Container Strategy

Server and Worker share the same Docker image with different runtime modes:

```yaml
# Server deployment
args: ["--mode=server"]
env:
  - name: MODE
    value: "server"

# Worker deployment
args: ["--mode=worker"]
env:
  - name: MODE
    value: "worker"
```

This approach:
- Simplifies CI/CD (single image build)
- Ensures code consistency between components
- Reduces container registry storage

## Traffic Flow

### API Requests

```
Client -> ALB/nginx Ingress -> /api/* -> Server Service -> Server Pods
```

### Static Assets

```
Client -> ALB/nginx Ingress -> /* -> Web Service -> Web Pods (nginx)
```

### SSE Connections

```
Client -> ALB/nginx Ingress -> /api/events -> Server Pod (persistent connection)
                                                    |
                                                    v
                                              Redis Pub/Sub
                                                    ^
                                                    |
                                              Worker Pod (publishes events)
```

## SSE Scaling with Redis

The challenge: SSE connections are long-lived and stateful. A client connected to Server-A won't receive events if Worker-B completes their job.

Solution: Redis pub/sub

1. Worker completes job
2. Worker publishes event to Redis channel
3. All Server instances receive the event
4. Server with the client connection forwards it via SSE

```typescript
// Server subscribes to Redis
redis.subscribe('sse:events', (message) => {
  // Forward to connected SSE clients
  sseClients.broadcast(message);
});

// Worker publishes after job completion
redis.publish('sse:events', JSON.stringify({
  type: 'job:completed',
  jobId: '...'
}));
```

## Horizontal Pod Autoscaling

| Component | Min | Max | Scale On |
|-----------|-----|-----|----------|
| Server | 2 | 10 | CPU 70%, Memory 80% |
| Worker | 2 | 10 | CPU 70% |
| Web | 2 | 5 | CPU 70% |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Backend Framework | Hono |
| Effect System | Effect TS |
| ORM | Drizzle |
| Frontend Framework | React |
| Routing | TanStack Router |
| Server State | TanStack Query |
| Forms | TanStack Form |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| AI | Google Gemini |
| Observability | OpenTelemetry, Datadog |

## Environment Configuration

Configuration is managed through:

1. **ConfigMap**: Non-sensitive settings (URLs, feature flags)
2. **Secrets**: Sensitive values (API keys, database credentials)
3. **Values files**: Environment-specific Helm values

Key environment variables:

| Variable | Description |
|----------|-------------|
| `MODE` | server or worker |
| `REDIS_URL` | Redis connection string |
| `POSTGRES_URL` | Database connection string |
| `AUTH_SECRET` | JWT signing secret |
| `GEMINI_API_KEY` | Google AI API key |
| `SSE_ADAPTER` | memory or redis |
| `STORAGE_PROVIDER` | s3, local, or memory |
