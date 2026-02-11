import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useQuickPlay } from '../use-quick-play';

// --- Mock HTMLAudioElement ---

let mockAudio: MockAudio;

interface MockAudio {
  src: string;
  currentTime: number;
  duration: number;
  preload: string;
  listeners: Record<string, Set<() => void>>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  fire: (event: string) => void;
}

function createMockAudio(): MockAudio {
  const listeners: Record<string, Set<() => void>> = {};
  return {
    src: '',
    currentTime: 0,
    duration: 0,
    preload: '',
    listeners,
    addEventListener: vi.fn((event: string, cb: () => void) => {
      listeners[event] ??= new Set();
      listeners[event].add(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: () => void) => {
      listeners[event]?.delete(cb);
    }),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    load: vi.fn(),
    fire(event: string) {
      for (const cb of listeners[event] ?? []) cb();
    },
  };
}

beforeEach(() => {
  mockAudio = createMockAudio();
  vi.stubGlobal(
    'Audio',
    vi.fn(() => mockAudio),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useQuickPlay', () => {
  it('initialises in idle state', () => {
    const { result } = renderHook(() => useQuickPlay());

    expect(result.current.playingId).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
  });

  it('creates Audio element with preload=none', () => {
    renderHook(() => useQuickPlay());
    expect(mockAudio.preload).toBe('none');
  });

  describe('toggle', () => {
    it('sets src, loads, and plays on canplay', () => {
      const { result } = renderHook(() => useQuickPlay());

      act(() => {
        result.current.toggle('item-1', 'https://example.com/audio.mp3');
      });

      expect(mockAudio.src).toBe('https://example.com/audio.mp3');
      expect(mockAudio.load).toHaveBeenCalled();
      expect(result.current.playingId).toBe('item-1');

      // play() should NOT have been called yet — waiting for canplay
      expect(mockAudio.play).not.toHaveBeenCalled();

      // Simulate browser buffering enough data
      act(() => {
        mockAudio.fire('canplay');
      });

      expect(mockAudio.play).toHaveBeenCalledOnce();
    });

    it('pauses when toggling the same item that is playing', () => {
      const { result } = renderHook(() => useQuickPlay());

      // Start playing item-1
      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
        mockAudio.fire('canplay');
        mockAudio.fire('play');
      });

      expect(result.current.isPlaying).toBe(true);

      // Toggle same item → should pause
      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
      });

      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it('resumes when toggling a paused item', () => {
      const { result } = renderHook(() => useQuickPlay());

      // Start → play → pause
      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
        mockAudio.fire('canplay');
        mockAudio.fire('play');
      });
      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
        mockAudio.fire('pause');
      });

      expect(result.current.isPlaying).toBe(false);
      mockAudio.play.mockClear();

      // Toggle again → should resume
      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
      });

      expect(mockAudio.play).toHaveBeenCalledOnce();
    });

    it('switches source when toggling a different item', () => {
      const { result } = renderHook(() => useQuickPlay());

      // Play item-1
      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
        mockAudio.fire('canplay');
        mockAudio.fire('play');
      });

      mockAudio.pause.mockClear();
      mockAudio.load.mockClear();
      mockAudio.play.mockClear();

      // Switch to item-2
      act(() => {
        result.current.toggle('item-2', 'https://example.com/b.mp3');
      });

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.src).toBe('https://example.com/b.mp3');
      expect(mockAudio.load).toHaveBeenCalled();
      expect(result.current.playingId).toBe('item-2');

      // Should wait for canplay before playing
      expect(mockAudio.play).not.toHaveBeenCalled();
      act(() => {
        mockAudio.fire('canplay');
      });
      expect(mockAudio.play).toHaveBeenCalledOnce();
    });
  });

  describe('stop', () => {
    it('resets all state', () => {
      const { result } = renderHook(() => useQuickPlay());

      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
        mockAudio.fire('canplay');
        mockAudio.fire('play');
      });

      act(() => {
        result.current.stop();
      });

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(0);
      expect(result.current.playingId).toBeNull();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
    });
  });

  describe('time and duration updates', () => {
    it('updates duration on durationchange', () => {
      const { result } = renderHook(() => useQuickPlay());

      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
        mockAudio.duration = 120;
        mockAudio.fire('durationchange');
      });

      expect(result.current.duration).toBe(120);
    });

    it('updates currentTime once per second', () => {
      const { result } = renderHook(() => useQuickPlay());

      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
        mockAudio.fire('canplay');
        mockAudio.fire('play');
      });

      // First timeupdate at 0.5s — should update (floor = 0, different from initial -1)
      act(() => {
        mockAudio.currentTime = 0.5;
        mockAudio.fire('timeupdate');
      });
      expect(result.current.currentTime).toBe(0.5);

      // Another timeupdate at 0.8s — same second, should NOT update
      act(() => {
        mockAudio.currentTime = 0.8;
        mockAudio.fire('timeupdate');
      });
      expect(result.current.currentTime).toBe(0.5);

      // Cross into second 1
      act(() => {
        mockAudio.currentTime = 1.2;
        mockAudio.fire('timeupdate');
      });
      expect(result.current.currentTime).toBe(1.2);
    });
  });

  describe('ended', () => {
    it('resets playingId and isPlaying on ended', () => {
      const { result } = renderHook(() => useQuickPlay());

      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
        mockAudio.fire('canplay');
        mockAudio.fire('play');
      });

      act(() => {
        mockAudio.fire('ended');
      });

      expect(result.current.playingId).toBeNull();
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('pauses and removes listeners on unmount', () => {
      const { unmount } = renderHook(() => useQuickPlay());

      unmount();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.removeEventListener).toHaveBeenCalledWith(
        'timeupdate',
        expect.any(Function),
      );
      expect(mockAudio.removeEventListener).toHaveBeenCalledWith(
        'ended',
        expect.any(Function),
      );
    });
  });

  describe('return value stability', () => {
    it('toggle and stop references are stable across renders', () => {
      const { result, rerender } = renderHook(() => useQuickPlay());

      const toggle1 = result.current.toggle;
      const stop1 = result.current.stop;

      rerender();

      expect(result.current.toggle).toBe(toggle1);
      expect(result.current.stop).toBe(stop1);
    });

    it('return object is referentially stable when values are unchanged', () => {
      const { result, rerender } = renderHook(() => useQuickPlay());

      const first = result.current;
      rerender();

      expect(result.current).toBe(first);
    });
  });

  describe('formatTime', () => {
    it('exposes formatTime', () => {
      const { result } = renderHook(() => useQuickPlay());

      expect(result.current.formatTime(0)).toBe('0:00');
      expect(result.current.formatTime(65)).toBe('1:05');
      expect(result.current.formatTime(3661)).toBe('61:01');
    });
  });
});
