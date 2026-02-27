import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SSEEvent } from '../../contracts/events';
import { SSEReplayBuffer } from '../replay-buffer';

const mockEvent = (type: string = 'job_completion'): SSEEvent =>
  ({
    type,
    jobId: 'job-1',
    jobType: 'generate-podcast',
    status: 'completed',
    podcastId: 'p-1',
  }) as SSEEvent;

describe('SSEReplayBuffer', () => {
  let buffer: SSEReplayBuffer;

  beforeEach(() => {
    buffer = new SSEReplayBuffer({ ttlMs: 5000, maxPerUser: 10 });
  });

  it('assigns monotonically increasing IDs', () => {
    const id1 = buffer.push('user-1', mockEvent());
    const id2 = buffer.push('user-1', mockEvent());
    const id3 = buffer.push('user-2', mockEvent());
    expect(Number(id1)).toBeLessThan(Number(id2));
    expect(Number(id2)).toBeLessThan(Number(id3));
  });

  it('isolates events per user', () => {
    buffer.push('user-1', mockEvent('job_completion'));
    buffer.push('user-2', mockEvent('entity_change'));

    const user1Events = buffer.getAfter('user-1', '0');
    const user2Events = buffer.getAfter('user-2', '0');

    expect(user1Events).toHaveLength(1);
    expect(user2Events).toHaveLength(1);
    expect(user1Events[0]!.event.type).toBe('job_completion');
    expect(user2Events[0]!.event.type).toBe('entity_change');
  });

  it('returns only events after the given ID', () => {
    const id1 = buffer.push('user-1', mockEvent());
    const id2 = buffer.push('user-1', mockEvent());
    buffer.push('user-1', mockEvent());

    const afterId1 = buffer.getAfter('user-1', id1);
    expect(afterId1).toHaveLength(2);
    expect(afterId1[0]!.id).toBe(id2);
  });

  it('returns empty array for unknown user', () => {
    expect(buffer.getAfter('unknown', '0')).toEqual([]);
  });

  it('evicts entries older than TTL', () => {
    vi.useFakeTimers();
    buffer.push('user-1', mockEvent());

    vi.advanceTimersByTime(6000); // Past 5000ms TTL

    buffer.push('user-1', mockEvent()); // Triggers eviction
    const events = buffer.getAfter('user-1', '0');
    expect(events).toHaveLength(1); // Only the new one

    vi.useRealTimers();
  });

  it('caps buffer at maxPerUser', () => {
    for (let i = 0; i < 15; i++) {
      buffer.push('user-1', mockEvent());
    }
    const events = buffer.getAfter('user-1', '0');
    expect(events).toHaveLength(10); // maxPerUser = 10
  });

  it('clears all buffers', () => {
    buffer.push('user-1', mockEvent());
    buffer.push('user-2', mockEvent());
    buffer.clear();
    expect(buffer.getAfter('user-1', '0')).toEqual([]);
    expect(buffer.getAfter('user-2', '0')).toEqual([]);
  });
});
