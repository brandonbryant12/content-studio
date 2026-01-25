# Task 13: Shared Hooks - SSE Optimization

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-dependencies.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/client-event-listeners.md`

## Context

`use-sse.ts` has unstable dependencies causing excessive reconnection cycles:

1. `handleEvent` callback (line 76) depends on `queryClient` and `updateConnectionState`
2. `connect` function (line 129) depends on `handleEvent`, `updateConnectionState`, and `getReconnectDelay`
3. The useEffect (line 145) depends on `enabled` and `connect`

When any dependency changes, the entire connection cycle restarts.

## Key Files

| File | Lines | Issue |
|------|-------|-------|
| `shared/hooks/use-sse.ts` | 76 | handleEvent has dependencies |
| `shared/hooks/use-sse.ts` | 129 | connect recreated on dependency change |
| `shared/hooks/use-sse.ts` | 145 | Effect triggers reconnection |

## Implementation

### 1. Use Refs for Stable References

```typescript
// Store callbacks in refs to avoid recreating them
const handleEventRef = useRef<(event: MessageEvent) => void>();
const connectRef = useRef<() => void>();

// Update refs when callbacks change (no effect dependency)
useEffect(() => {
  handleEventRef.current = (event: MessageEvent) => {
    // ... event handling logic
    queryClient.invalidateQueries({ queryKey: event.data.queryKey });
    updateConnectionState('connected');
  };
}, [queryClient, updateConnectionState]);
```

### 2. Stable Connect Function

```typescript
// connect function uses refs, so it doesn't need to be recreated
const connect = useCallback(() => {
  if (!enabled || eventSourceRef.current) return;

  const es = new EventSource(url);

  es.onmessage = (event) => {
    handleEventRef.current?.(event);  // Use ref
  };

  es.onerror = () => {
    // ... error handling using refs
  };

  eventSourceRef.current = es;
}, [enabled, url]); // Minimal deps - only things that truly require reconnection
```

### 3. Simplified Effect

```typescript
useEffect(() => {
  if (enabled) {
    connect();
  }

  return () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  };
}, [enabled, connect]); // connect is now stable
```

## Test Requirements

Add test for connection stability:
```typescript
it('does not reconnect when unrelated state changes', () => {
  const { rerender } = renderHook(() => useSSE({ enabled: true, url: '/events' }));
  // Simulate parent re-render
  rerender();
  // Verify EventSource was not recreated
});
```

## Implementation Notes

<!-- Agent writes notes here as it implements -->

## Verification Log

<!-- Agent writes verification results here -->
- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web test` passes
- [ ] Connection stability test passes
- [ ] No unnecessary reconnections on parent re-render
