# Access Control

```mermaid
graph LR
  Request[HTTP Request] --> Middleware[better-auth Middleware]
  Middleware -->|AuthN| Session[Session + User]
  Middleware -->|SSO mode role sync| Graph[Microsoft Graph transitiveMemberOf]
  Graph -->|Group IDs -> app role| DB[(PostgreSQL)]
  Session --> Handler[oRPC Handler]
  Handler --> FiberRef[FiberRef: getCurrentUser]
  FiberRef --> UseCase[Use Case]
  UseCase -->|AuthZ: ownership check| Repo[Repository]
  Repo -->|userId param| DB[(PostgreSQL)]
```

## Golden Principles

1. All mutations and reads require authentication via `protectedProcedure`.
<!-- enforced-by: types -->

2. Use cases access the current user via `getCurrentUser` FiberRef, never from direct parameters.
<!-- enforced-by: architecture -->

3. Repositories are user-agnostic: they accept `userId` as a parameter, never import `getCurrentUser`.
<!-- enforced-by: invariant-test -->

4. Denied access returns 404 (resource concealment), not 403.
<!-- enforced-by: manual-review -->

## Authentication (AuthN)
<!-- enforced-by: types -->

| Layer | Mechanism |
|---|---|
| HTTP | `better-auth` validates session from bearer token (`Authorization`) via bearer plugin (bearer-only transport; cookie fallback disabled) |
| Login mode | `AUTH_MODE` selects providers: `dev-password`, `hybrid`, `sso-only` |
| SSO role sync | In SSO modes, `databaseHooks.session.create.after` calls Microsoft Graph `transitiveMemberOf` and maps configured group IDs to `admin`/`user` |
| oRPC | `protectedProcedure` middleware extracts `user` from session, rejects with `UNAUTHORIZED` if null |
| Handler | Receives `AuthenticatedORPCContext` with typed `user` field |

Auth-context failure semantics:
- Expected no-session resolves to `{ session: null, user: null }` and can later produce `UNAUTHORIZED` on protected routes.
- Unexpected auth/session lookup failures during context creation map to `SERVICE_UNAVAILABLE` with request-scoped logging (`requestId` + stable auth-context error tag).

The `protectedProcedure` type guarantees that handlers receive a non-null user. Handlers that use `baseProcedure` receive `user: User | null` and must handle the null case explicitly.

Role mapping intentionally uses Graph API lookup (instead of token `groups` claim) to avoid group-claim overage behavior for users in many groups.

### SSO Sign-In Sequence

```mermaid
sequenceDiagram
  participant U as User Browser
  participant W as Web App
  participant A as Server /api/auth
  participant MS as Microsoft Identity
  participant G as Microsoft Graph
  participant DB as PostgreSQL

  U->>W: Click "Sign in with Microsoft"
  W->>A: GET /auth/sign-in/social (microsoft)
  A-->>U: 302 Redirect to Microsoft login
  U->>MS: Authenticate + consent
  MS-->>A: OAuth callback with code
  A->>DB: Create/refresh user + session
  A->>G: GET transitiveMemberOf(user)
  G-->>A: Group IDs
  A->>DB: Map groups -> role (admin/user)
  A-->>W: Response with set-auth-token header
  W->>W: Store bearer token in memory
```

### Bearer API Request Sequence

```mermaid
sequenceDiagram
  participant W as Web App
  participant API as Server /api/*
  participant BA as better-auth
  participant DB as PostgreSQL

  W->>API: Request with Authorization: Bearer <token>
  API->>BA: getSession(headers: authorization only)
  BA->>DB: Resolve session + user
  DB-->>BA: Session + user
  BA-->>API: Authenticated session
  API-->>W: Protected resource response
```

### Session Refresh Policy

Current behavior is intentionally bearer-only and uses Better Auth defaults (we do not override session timing in app config today).

| Policy Area | Current Setting | Notes |
|---|---|---|
| Session expiry (`expiresIn`) | 7 days | Better Auth server default |
| Session refresh window (`updateAge`) | 1 day | Better Auth server default (sliding refresh when session is read) |
| Browser background refresh | Focus-based refetch enabled | Better Auth client default: `refetchOnWindowFocus=true` |
| Browser polling | Disabled | Better Auth client default: `refetchInterval=0` |
| Offline refetch | Disabled | Better Auth client default: `refetchWhenOffline=false` |
| 401 recovery for API calls | Single refresh + single retry | `packages/api` client calls web `refreshAccessToken()` and retries once |
| Token transport | `Authorization: Bearer <token>` only | No cookie fallback on client or server session lookup |
| Token storage | In-memory only | Full page reload clears token and may require sign-in again |

Operational implications:

1. Active users usually stay authenticated via focus-triggered session reads/refresh.
2. If a request gets `401`, the app attempts one session refresh and retries once.
3. No persistent browser auth state is kept across full reloads by design (security-first bearer model).

If we need a different enterprise policy (for example shorter idle timeout, explicit absolute timeout, or polling refresh), define explicit `session` options in server auth config and expose client `sessionOptions` via the auth client wrapper.

### Auth Transport Decision (Bearer-Only)

This codebase standardizes on bearer-only user auth transport.

Why this is the default:

1. Web and API are expected to run on different domains in EKS.
2. Bearer-only requests avoid credentialed CORS requirements and cookie domain coupling.
3. It removes ambient-cookie auth behavior (reduced CSRF-style risk surface).

Tradeoffs to keep in mind:

1. We intentionally do not persist auth tokens across full page reloads.
2. API clients must handle explicit `401` recovery (refresh once, retry once).
3. If product requirements later demand seamless reload persistence, we will need a documented storage policy change.

Enterprise baseline:

1. Bearer token transport is common for split-domain SPA + API architectures.
2. HttpOnly cookie sessions are common for same-origin server-rendered applications.
3. For this architecture, bearer-only is the operational default unless an ADR explicitly changes it.

### Service-to-Service Auth Status

Current runtime topology has no internal service-to-service HTTP auth flow:

1. `apps/server` and `apps/worker` each use shared infrastructure (PostgreSQL, Redis, S3) directly.
2. `apps/worker` does not call protected server HTTP APIs with user tokens.
3. There is no separate machine-token policy configured today.

## Authorization (AuthZ)
<!-- enforced-by: architecture -->

Authorization is enforced at the **use case** layer, not the handler layer.

| Pattern | Where | How |
|---|---|---|
| Current user | Use case | `yield* getCurrentUser` from FiberRef |
| Resource ownership | Repository query | `WHERE userId = $userId AND id = $resourceId` |
| Job ownership | Safety primitive | `getOwnedJobOrNotFound(jobId)` checks user owns the parent resource |
| Collaborator access | Use case | Query collaborator table, verify `userId` is set (invite claimed) |

### getCurrentUser FiberRef

The handler sets the current user on the Effect FiberRef before running the use case. Use cases access it via:

```typescript
const user = yield* getCurrentUser;
```

This decouples use cases from HTTP context while ensuring every use case has access to the authenticated user.

## Denial Semantics
<!-- enforced-by: manual-review -->

| Scenario | Response | Rationale |
|---|---|---|
| Resource not found | 404 NOT_FOUND | Standard |
| Resource exists but owned by another user | 404 NOT_FOUND | Resource concealment: do not reveal existence |
| Collaborator with pending invite (userId is null) | 404 NOT_FOUND | Invite not yet claimed |
| Unauthenticated request | 401 UNAUTHORIZED | No valid session |
| Admin-only action by non-admin | 403 FORBIDDEN | Role existence is public knowledge |

## Ownership Helpers
<!-- enforced-by: invariant-test -->

| Helper | Purpose | Enforced By |
|---|---|---|
| `getOwnedJobOrNotFound(jobId)` | Verifies user owns the resource associated with the job | Invariant test: all `get-job` use cases must use this |
| `withTransactionalStateAndEnqueue(...)` | Atomic status change + job enqueue in one transaction | Invariant test: state-change + enqueue use cases must use this |

## Repository Rules
<!-- enforced-by: architecture -->

Repositories must:
- Accept `userId` as an explicit parameter on ownership-scoped queries
- Never import or call `getCurrentUser`
- Prefer querying with ownership predicate (`id + userId`) for owner-only resources
- Prefer domain typed not-found for both true-missing and not-owned (concealment)

Use cases should prefer ownership-scoped repo methods over `findById` + `requireOwnership` for owner-only flows.

## Multi-User / Collaboration
<!-- enforced-by: manual-review -->

For features with shared access (e.g., podcast collaborators):

1. Owner has full CRUD access
2. Collaborator access requires a row in the collaborator table with `userId` set (not null)
3. Pending invites (`userId: null`) grant no access until claimed
4. Use case queries both ownership and collaboration tables to determine access
