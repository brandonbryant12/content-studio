import { describe, it, expect } from 'vitest';
import { isQuickStartVisible, VoiceoverStatus } from '../lib/status';

describe('isQuickStartVisible', () => {
  it('returns true for DRAFTING with empty text and no audio', () => {
    expect(
      isQuickStartVisible({
        status: VoiceoverStatus.DRAFTING,
        text: '',
        audioUrl: null,
      }),
    ).toBe(true);
  });

  it('returns true for whitespace-only text (trimmed)', () => {
    expect(
      isQuickStartVisible({
        status: VoiceoverStatus.DRAFTING,
        text: '   \n\t  ',
        audioUrl: null,
      }),
    ).toBe(true);
  });

  it('returns false when voiceover has text', () => {
    expect(
      isQuickStartVisible({
        status: VoiceoverStatus.DRAFTING,
        text: 'Hello world',
        audioUrl: null,
      }),
    ).toBe(false);
  });

  it('returns false when voiceover has audio', () => {
    expect(
      isQuickStartVisible({
        status: VoiceoverStatus.DRAFTING,
        text: '',
        audioUrl: 'https://example.com/audio.mp3',
      }),
    ).toBe(false);
  });

  it('returns false for READY status with empty text', () => {
    expect(
      isQuickStartVisible({
        status: VoiceoverStatus.READY,
        text: '',
        audioUrl: null,
      }),
    ).toBe(false);
  });

  it('returns false for GENERATING_AUDIO status with empty text', () => {
    expect(
      isQuickStartVisible({
        status: VoiceoverStatus.GENERATING_AUDIO,
        text: '',
        audioUrl: null,
      }),
    ).toBe(false);
  });
});
