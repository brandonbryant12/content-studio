# Development Setup

This document covers the requirements and setup for developing and testing the codebase.

## Requirements

### System Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 22.10.0 | Required for runtime |
| pnpm | 10.23.0 | Package manager (via corepack) |
| Docker | Latest | Required for test database |

### Optional

| Tool | Purpose |
|------|---------|
| Docker Compose | Orchestrating test database |
| PostgreSQL client | Direct DB access (psql) |

## Initial Setup

```bash
# 1. Enable corepack for pnpm
corepack enable

# 2. Install dependencies
pnpm install

# 3. Copy environment files
pnpm env:copy-example

# 4. Start development services (Postgres + Redis)
docker compose up -d

# 5. Push database schema
pnpm db:push
```

## Test Database

Tests require a PostgreSQL database running on port 5433.

### Start Test Database

```bash
# Start the test database container
pnpm test:db:up

# Push schema to test database
pnpm test:db:setup
```

### Stop Test Database

```bash
pnpm test:db:down
```

### Test Database Details

| Setting | Value |
|---------|-------|
| Host | localhost |
| Port | 5433 |
| Database | content_studio_test |
| User | test |
| Password | test |
| Connection URL | `postgresql://test:test@localhost:5433/content_studio_test` |

The test database uses `tmpfs` for storage, making it fast but ephemeral. Data is lost when the container stops.

## Running Tests

### Prerequisites

1. Test database must be running: `pnpm test:db:up`
2. Schema must be pushed: `pnpm test:db:setup`

### Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific package tests
pnpm --filter @repo/media test
pnpm --filter @repo/api test

# Run E2E tests
pnpm test:e2e
```

## Common Commands

### Development

```bash
# Start all dev servers
pnpm dev

# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Format code
pnpm format:fix
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @repo/media build
```

### Database

```bash
# Push schema changes
pnpm db:push

# Open Drizzle Studio
pnpm db:studio
```

## Environment Variables

After running `pnpm env:copy-example`, configure these in your `.env` files:

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_TYPE` | Storage backend (s3/local) | local |
| `SERVER_REDIS_URL` | Redis connection for SSE pub/sub | `redis://localhost:6379` |
| `S3_BUCKET` | S3 bucket name | - |
| `S3_REGION` | S3 region | - |

## Troubleshooting

### Test database connection refused

```bash
# Check if container is running
docker ps

# Restart test database
pnpm test:db:down && pnpm test:db:up

# Re-push schema
pnpm test:db:setup
```

### Port 5433 already in use

```bash
# Find process using port
lsof -i :5433

# Kill the process or change port in docker-compose.test.yml
```

### Schema out of sync

```bash
# For development database
pnpm db:push

# For test database
DB_POSTGRES_URL=postgresql://test:test@localhost:5433/content_studio_test pnpm db:push
```

### pnpm version mismatch

```bash
# Enable corepack
corepack enable

# This will use the version specified in package.json
pnpm install
```
