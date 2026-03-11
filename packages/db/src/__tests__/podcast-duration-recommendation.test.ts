import { describe, expect, it } from 'vitest';
import { recommendPodcastTargetDurationMinutes } from '../schema';

describe('recommendPodcastTargetDurationMinutes', () => {
  it('returns null when source volume is unavailable', () => {
    expect(
      recommendPodcastTargetDurationMinutes({
        totalSourceWords: 0,
        sourceCount: 1,
      }),
    ).toBeNull();
  });

  it('keeps small source sets concise', () => {
    expect(
      recommendPodcastTargetDurationMinutes({
        totalSourceWords: 240,
        sourceCount: 1,
      }),
    ).toBe(1);
  });

  it('scales up with larger source volume', () => {
    expect(
      recommendPodcastTargetDurationMinutes({
        totalSourceWords: 2600,
        sourceCount: 1,
      }),
    ).toBe(5);
  });

  it('adds a small breadth boost for multi-source episodes', () => {
    expect(
      recommendPodcastTargetDurationMinutes({
        totalSourceWords: 1600,
        sourceCount: 3,
      }),
    ).toBe(4);
  });

  it('respects the configured maximum', () => {
    expect(
      recommendPodcastTargetDurationMinutes({
        totalSourceWords: 12000,
        sourceCount: 5,
      }),
    ).toBe(10);
  });
});
