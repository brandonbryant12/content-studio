# Task 01: Refactor Workers into Unified Worker

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/patterns/use-case.md` - Effect TS patterns

## Context

Currently, the server launches two separate workers in `apps/server/src/server.ts`:
- `podcast-worker.ts` - Handles generate-podcast, generate-script, generate-audio jobs
- `voiceover-worker.ts` - Handles generate-voiceover jobs

Both workers share the same architecture:
- Poll queue every 3 seconds
- Exponential backoff on errors (capped at 60s)
- Max 10 consecutive errors before shutdown
- Emit SSE events via sseManager

For Kubernetes deployment, we need:
1. A single unified worker that handles all job types
2. A CLI flag to run the server in "server" or "worker" mode
3. Worker mode should skip HTTP server startup

## Key Files

- `apps/server/src/server.ts` - Main entry point (add --mode flag parsing)
- `apps/server/src/workers/podcast-worker.ts` - Existing podcast worker logic
- `apps/server/src/workers/voiceover-worker.ts` - Existing voiceover worker logic
- `apps/server/src/workers/unified-worker.ts` - NEW: Combined worker
- `apps/server/src/constants.ts` - Worker configuration constants

## Implementation Steps

### 1.1 Create Unified Worker

Create `apps/server/src/workers/unified-worker.ts`:
- Import job handlers from existing workers
- Single polling loop that checks for all job types
- Reuse existing error handling and backoff logic
- Accept sseManager and runtime as dependencies

```typescript
// Pseudocode structure
export const createUnifiedWorker = (deps: WorkerDeps) => {
  const jobHandlers = {
    'generate-podcast': handlePodcastJob,
    'generate-script': handleScriptJob,
    'generate-audio': handleAudioJob,
    'generate-voiceover': handleVoiceoverJob,
  };

  // Single polling loop
  while (running) {
    const job = await pollForAnyJob(Object.keys(jobHandlers));
    if (job) {
      await jobHandlers[job.type](job);
    }
  }
};
```

### 1.2 Add CLI Mode Flag

Update `apps/server/src/server.ts`:
- Parse `--mode=server|worker` from process.argv
- Default to "server" mode for backwards compatibility
- In server mode: start HTTP server + workers (existing behavior OR just HTTP)
- In worker mode: only start unified worker, no HTTP server

```typescript
const mode = process.argv.includes('--mode=worker') ? 'worker' : 'server';

if (mode === 'server') {
  // Start Hono HTTP server
  serve({ fetch: app.fetch, port, hostname });
} else {
  // Start unified worker only
  console.log('Starting in worker mode...');
  await runUnifiedWorker(runtime, sseManager);
}
```

### 1.3 Update Environment Schema

Add to `apps/server/src/env.ts`:
- `WORKER_MODE` environment variable as alternative to CLI flag
- Useful for container environments where CLI args are harder to configure

### 1.4 Add Health Check for Worker Mode

Workers need a health signal for Kubernetes:
- Option A: Write to a file that can be checked with `cat`
- Option B: Simple HTTP endpoint on different port (e.g., 3036)
- Option C: Process liveness (just check if process is running)

Recommend Option A for simplicity:
```typescript
// Worker writes timestamp to /tmp/worker-health every poll cycle
fs.writeFileSync('/tmp/worker-health', Date.now().toString());
```

### 1.5 Write Tests

Create `apps/server/src/workers/__tests__/unified-worker.test.ts`:
- Test that all job types are handled
- Test polling behavior
- Test error handling and backoff
- Mock the queue and job handlers

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WORKER_MODE` | No | `false` | Alternative to --mode=worker flag |

## Verification Log

<!-- Agent writes verification results here -->
