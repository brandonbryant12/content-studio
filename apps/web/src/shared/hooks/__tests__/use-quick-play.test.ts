import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useQuickPlay } from '../use-quick-play';

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

const renderQuickPlay = () => renderHook(() => useQuickPlay());

const startPlayback = (
  toggle: (id: string, url: string) => void,
  id = 'item-1',
  url = 'https://example.com/a.mp3',
) => {
  act(() => {
    toggle(id, url);
    mockAudio.fire('canplay');
    mockAudio.fire('play');
  });
};

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
  it('initialises idle state and creates audio with preload=none', () => {
    const { result } = renderQuickPlay();

    expect(result.current.playingId).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(mockAudio.preload).toBe('none');
  });

  it('loads source and starts playback only after canplay', () => {
    const { result } = renderQuickPlay();

    act(() => {
      result.current.toggle('item-1', 'https://example.com/audio.mp3');
    });

    expect(mockAudio.src).toBe('https://example.com/audio.mp3');
    expect(mockAudio.load).toHaveBeenCalled();
    expect(result.current.playingId).toBe('item-1');
    expect(mockAudio.play).not.toHaveBeenCalled();

    act(() => {
      mockAudio.fire('canplay');
    });
    expect(mockAudio.play).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: 'pauses when toggling the current playing item',
      playState: true,
      expectedPlayCalls: 0,
      expectedPauseCalls: 1,
    },
    {
      name: 'resumes when toggling the current paused item',
      playState: false,
      expectedPlayCalls: 1,
      expectedPauseCalls: 0,
    },
  ])('$name', ({ playState, expectedPlayCalls, expectedPauseCalls }) => {
    const { result } = renderQuickPlay();

    startPlayback(result.current.toggle);

    if (!playState) {
      act(() => {
        result.current.toggle('item-1', 'https://example.com/a.mp3');
        mockAudio.fire('pause');
      });
    }

    mockAudio.play.mockClear();
    mockAudio.pause.mockClear();

    act(() => {
      result.current.toggle('item-1', 'https://example.com/a.mp3');
    });

    expect(mockAudio.play).toHaveBeenCalledTimes(expectedPlayCalls);
    expect(mockAudio.pause).toHaveBeenCalledTimes(expectedPauseCalls);
  });

  it('switches source when toggling a different item', () => {
    const { result } = renderQuickPlay();
    startPlayback(result.current.toggle, 'item-1', 'https://example.com/a.mp3');

    mockAudio.pause.mockClear();
    mockAudio.load.mockClear();
    mockAudio.play.mockClear();

    act(() => {
      result.current.toggle('item-2', 'https://example.com/b.mp3');
    });

    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockAudio.src).toBe('https://example.com/b.mp3');
    expect(mockAudio.load).toHaveBeenCalled();
    expect(result.current.playingId).toBe('item-2');
    expect(mockAudio.play).not.toHaveBeenCalled();

    act(() => {
      mockAudio.fire('canplay');
    });
    expect(mockAudio.play).toHaveBeenCalledOnce();
  });

  it('stop resets playback and timing state', () => {
    const { result } = renderQuickPlay();
    startPlayback(result.current.toggle);

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

  it('updates duration on durationchange', () => {
    const { result } = renderQuickPlay();

    act(() => {
      result.current.toggle('item-1', 'https://example.com/a.mp3');
      mockAudio.duration = 120;
      mockAudio.fire('durationchange');
    });

    expect(result.current.duration).toBe(120);
  });

  it('updates currentTime at most once per second', () => {
    const { result } = renderQuickPlay();
    startPlayback(result.current.toggle);

    act(() => {
      mockAudio.currentTime = 0.5;
      mockAudio.fire('timeupdate');
    });
    expect(result.current.currentTime).toBe(0.5);

    act(() => {
      mockAudio.currentTime = 0.8;
      mockAudio.fire('timeupdate');
    });
    expect(result.current.currentTime).toBe(0.5);

    act(() => {
      mockAudio.currentTime = 1.2;
      mockAudio.fire('timeupdate');
    });
    expect(result.current.currentTime).toBe(1.2);
  });

  it('resets playing state on ended', () => {
    const { result } = renderQuickPlay();
    startPlayback(result.current.toggle);

    act(() => {
      mockAudio.fire('ended');
    });

    expect(result.current.playingId).toBeNull();
    expect(result.current.isPlaying).toBe(false);
  });

  it('cleans up audio listeners on unmount', () => {
    const { unmount } = renderQuickPlay();
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

  it('keeps handler references and return object stable when unchanged', () => {
    const { result, rerender } = renderQuickPlay();
    const first = result.current;

    rerender();

    expect(result.current.toggle).toBe(first.toggle);
    expect(result.current.stop).toBe(first.stop);
    expect(result.current).toBe(first);
  });

  it('exposes formatTime helper', () => {
    const { result } = renderQuickPlay();

    expect(result.current.formatTime(0)).toBe('0:00');
    expect(result.current.formatTime(65)).toBe('1:05');
    expect(result.current.formatTime(3661)).toBe('61:01');
  });
});
