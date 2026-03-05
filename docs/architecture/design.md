# System Design

This page explains why Content Studio is organized the way it is.

## Design Principles

1. Contracts define the boundary. API shape lives in `packages/api/src/contracts` and drives both server handlers and typed web clients.
2. Handlers stay thin. Business logic lives in `@repo/media` use cases, not in Hono routes or React components.
3. Data access stays in repositories. Repos own Drizzle queries and return domain objects to use cases.
4. Processes share one runtime per process. `apps/server` and `apps/worker` each build a single `ManagedRuntime` and reuse it.
5. Async work is explicit. Long-running generation flows write jobs to PostgreSQL and finish in `apps/worker`.
6. The web app is feature-based. Routes stay thin and delegate to `features/*` modules plus shared hooks and components.

## Dependency Direction

```mermaid
flowchart LR
  classDef entry fill:#e8f1ff,stroke:#1d4ed8,color:#0f172a,stroke-width:1.5px;
  classDef runtime fill:#ecfdf3,stroke:#15803d,color:#0f172a,stroke-width:1.5px;
  classDef async fill:#fff7ed,stroke:#c2410c,color:#0f172a,stroke-width:1.5px;
  classDef store fill:#f5f5f4,stroke:#57534e,color:#0f172a,stroke-width:1.5px;
  classDef control fill:#fef2f2,stroke:#b91c1c,color:#0f172a,stroke-width:1.5px;

  subgraph Web["apps/web"]
    Routes[Routes]
    Features[Feature modules]
    SharedUI[Shared hooks and UI]
  end

  subgraph Server["apps/server"]
    Hono[Hono routes]
    API[createApi()]
  end

  subgraph Worker["apps/worker"]
    WorkerLoop[Unified worker]
  end

  subgraph Shared["packages/*"]
    Contracts["@repo/api contracts + server runtime"]
    Media["@repo/media use cases + repos"]
    Auth["@repo/auth"]
    DB["@repo/db"]
    Queue["@repo/queue"]
    Storage["@repo/storage"]
    AI["@repo/ai"]
    UI["@repo/ui"]
  end

  Routes --> Features --> Contracts
  Features --> SharedUI
  Features --> UI

  Hono --> API --> Contracts
  API --> Media
  WorkerLoop --> Contracts
  WorkerLoop --> Media

  Media --> Auth
  Media --> DB
  Media --> Queue
  Media --> Storage
  Media --> AI
  Auth --> DB
  Queue --> DB

  class Routes,Hono,WorkerLoop entry;
  class Features,SharedUI,API,Contracts,Media,UI runtime;
  class Auth control;
  class DB,Queue,Storage,AI store;
```

## Domain Map

| Domain | What it owns | Primary runtime pattern |
|---|---|---|
| Sources | Ingested text, uploaded files, URL/research import, parsed content | Sync CRUD plus background processing jobs |
| Personas | Style, tone, and avatar generation inputs | Sync CRUD plus async avatar/image generation |
| Podcasts | Script, sources, personas, audio generation workflow | Async generation with SSE updates |
| Voiceovers | Focused narration text and TTS output | Async generation with SSE updates |
| Infographics | Prompting, versions, visual outputs, style presets | Async generation with version history |
| Admin / Activity | Audit-style activity views and stats | Sync read APIs backed by activity log data |

## Frontend Shape

| Layer | Responsibility | Current location |
|---|---|---|
| Route files | URL structure, route guards, preload wiring | `apps/web/src/routes` |
| Feature containers | Query + mutation orchestration | `apps/web/src/features/*/components/*-container.tsx` |
| Feature hooks | Query/mutation hooks, optimistic updates, UI-specific orchestration | `apps/web/src/features/*/hooks` |
| Shared hooks/components | Cross-feature behaviors like SSE, bulk actions, dialogs, audio playback | `apps/web/src/shared` |
| API clients | Typed oRPC/OpenAPI client and auth refresh integration | `apps/web/src/clients` |

The intended dependency flow is:

`route -> feature container -> feature hooks -> typed API client -> server contract`

## Intentional Tradeoffs

| Decision | Why it exists | Cost |
|---|---|---|
| Bearer-only browser auth | Supports split web/API domains without cookie coupling | Full page reload does not preserve browser auth state |
| PostgreSQL-backed job queue | Keeps async state in the primary datastore and reduces moving parts | Lower throughput ceiling than a dedicated queue product |
| Shared Effect runtime per process | Centralizes service wiring and lifecycle management | Background loops must respect Effect runtime rules |
| Backend-only telemetry | Keeps browser surface simpler and avoids client telemetry creep | No client-side traces by default |
| Feature-based SPA organization | Keeps route behavior and domain UI changes local | Shared abstractions must be promoted deliberately |

## Adding A New Modality

1. Add schema and serializers in `@repo/db`.
2. Add repos, errors, and use cases in `@repo/media`.
3. Add contract and router handlers in `@repo/api`.
4. Add route files, feature modules, and hooks in `apps/web`.
5. If the flow is asynchronous, add job payloads and worker handlers.
6. Update docs, generated spec artifacts, and the relevant test surfaces.

## Read Next

- [`docs/architecture/overview.md`](./overview.md)
- [`docs/architecture/security.md`](./security.md)
- [`docs/frontend/project-structure.md`](../frontend/project-structure.md)
- [`docs/patterns/use-case.md`](../patterns/use-case.md)
