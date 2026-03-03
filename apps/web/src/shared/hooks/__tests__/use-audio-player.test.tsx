import { render, act } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAudioPlayer } from '../use-audio-player';

type AudioSnapshot = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoaded: boolean;
};

const EMPTY_SNAPSHOT: AudioSnapshot = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isLoaded: false,
};

function Harness({
  src,
  initialDuration,
  onSnapshot,
}: {
  src: string;
  initialDuration?: number | null;
  onSnapshot: (snapshot: AudioSnapshot) => void;
}) {
  const { audioRef, isPlaying, currentTime, duration, isLoaded } =
    useAudioPlayer(src, initialDuration);

  useEffect(() => {
    onSnapshot({ isPlaying, currentTime, duration, isLoaded });
  }, [onSnapshot, isPlaying, currentTime, duration, isLoaded]);

  return <audio ref={audioRef} src={src} data-testid="audio" />;
}

function renderHarness(src: string, initialDuration?: number) {
  const latestState = { current: EMPTY_SNAPSHOT };
  const onSnapshot = (snapshot: AudioSnapshot) => {
    latestState.current = snapshot;
  };

  const view = render(
    <Harness
      src={src}
      initialDuration={initialDuration}
      onSnapshot={onSnapshot}
    />,
  );

  return {
    latestState,
    audio: view.getByTestId('audio') as HTMLAudioElement,
    rerender: (nextSrc: string, nextInitialDuration?: number) =>
      view.rerender(
        <Harness
          src={nextSrc}
          initialDuration={nextInitialDuration}
          onSnapshot={onSnapshot}
        />,
      ),
  };
}

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() =>
      Promise.resolve(),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resets playback state when the source changes', () => {
    const { latestState, audio, rerender } = renderHarness(
      'https://example.com/audio-a.mp3',
      120,
    );

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

    expect(latestState.current).toMatchObject({
      isPlaying: true,
      currentTime: 42,
      duration: 95,
      isLoaded: true,
    });

    act(() => {
      rerender('https://example.com/audio-b.mp3');
    });

    expect(latestState.current).toMatchObject(EMPTY_SNAPSHOT);
  });

  it('re-applies initial duration when metadata inputs change', () => {
    const { latestState, audio, rerender } = renderHarness(
      'https://example.com/audio.mp3',
      180,
    );

    expect(latestState.current.duration).toBe(180);

    act(() => {
      Object.defineProperty(audio, 'duration', {
        value: 210,
        configurable: true,
      });
      audio.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(latestState.current).toMatchObject({
      duration: 210,
      isLoaded: true,
    });

    act(() => {
      rerender('https://example.com/audio.mp3', 75);
    });

    expect(latestState.current).toMatchObject({
      duration: 75,
      isLoaded: false,
    });
  });
});
