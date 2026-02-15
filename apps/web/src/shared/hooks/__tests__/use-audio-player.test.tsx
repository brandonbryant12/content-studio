import { render, act } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useAudioPlayer,
  type UseAudioPlayerReturn,
} from '../use-audio-player';

type AudioSnapshot = Pick<
  UseAudioPlayerReturn,
  'isPlaying' | 'currentTime' | 'duration' | 'isLoaded'
>;

interface HarnessProps {
  src: string;
  initialDuration?: number | null;
  onSnapshot: (snapshot: AudioSnapshot) => void;
}

const EMPTY_SNAPSHOT: AudioSnapshot = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isLoaded: false,
};

function Harness({ src, initialDuration, onSnapshot }: HarnessProps) {
  const { audioRef, isPlaying, currentTime, duration, isLoaded } = useAudioPlayer(
    src,
    initialDuration,
  );

  useEffect(() => {
    onSnapshot({
      isPlaying,
      currentTime,
      duration,
      isLoaded,
    });
  }, [onSnapshot, isPlaying, currentTime, duration, isLoaded]);

  return <audio ref={audioRef} src={src} data-testid="audio" />;
}

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(
      () => Promise.resolve(),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resets playback state when the source changes', () => {
    const latestState = { current: EMPTY_SNAPSHOT };

    const { getByTestId, rerender } = render(
      <Harness
        src="https://example.com/audio-a.mp3"
        initialDuration={120}
        onSnapshot={(snapshot) => {
          latestState.current = snapshot;
        }}
      />,
    );

    const audio = getByTestId('audio') as HTMLAudioElement;

    expect(latestState.current.duration).toBe(120);

    act(() => {
      audio.dispatchEvent(new Event('play'));
      audio.currentTime = 42;
      audio.dispatchEvent(new Event('timeupdate'));
      Object.defineProperty(audio, 'duration', {
        value: 95,
        configurable: true,
      });
      audio.dispatchEvent(new Event('durationchange'));
    });

    expect(latestState.current.isPlaying).toBe(true);
    expect(latestState.current.currentTime).toBe(42);
    expect(latestState.current.duration).toBe(95);
    expect(latestState.current.isLoaded).toBe(true);

    act(() => {
      rerender(
        <Harness
          src="https://example.com/audio-b.mp3"
          onSnapshot={(snapshot) => {
            latestState.current = snapshot;
          }}
        />,
      );
    });

    expect(latestState.current.isPlaying).toBe(false);
    expect(latestState.current.currentTime).toBe(0);
    expect(latestState.current.duration).toBe(0);
    expect(latestState.current.isLoaded).toBe(false);
  });

  it('re-applies initial duration when metadata inputs change', () => {
    const latestState = { current: EMPTY_SNAPSHOT };

    const { getByTestId, rerender } = render(
      <Harness
        src="https://example.com/audio.mp3"
        initialDuration={180}
        onSnapshot={(snapshot) => {
          latestState.current = snapshot;
        }}
      />,
    );

    const audio = getByTestId('audio') as HTMLAudioElement;

    expect(latestState.current.duration).toBe(180);

    act(() => {
      Object.defineProperty(audio, 'duration', {
        value: 210,
        configurable: true,
      });
      audio.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(latestState.current.duration).toBe(210);
    expect(latestState.current.isLoaded).toBe(true);

    act(() => {
      rerender(
        <Harness
          src="https://example.com/audio.mp3"
          initialDuration={75}
          onSnapshot={(snapshot) => {
            latestState.current = snapshot;
          }}
        />,
      );
    });

    expect(latestState.current.duration).toBe(75);
    expect(latestState.current.isLoaded).toBe(false);
  });
});
