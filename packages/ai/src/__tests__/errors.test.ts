import { describe, expect, it } from 'vitest';
import {
  AudioError,
  ImageGenContentFilteredError,
  ResearchError,
  TTSError,
  TTSQuotaExceededError,
} from '../errors';

describe('ai errors getData', () => {
  it('TTSError exposes message', () => {
    const error = new TTSError({ message: 'tts failed' });
    expect(TTSError.getData(error)).toEqual({ message: 'tts failed' });
  });

  it('TTSQuotaExceededError exposes message', () => {
    const error = new TTSQuotaExceededError({ message: 'quota exceeded' });
    expect(TTSQuotaExceededError.getData(error)).toEqual({
      message: 'quota exceeded',
    });
  });

  it('AudioError exposes message', () => {
    const error = new AudioError({ message: 'audio failed' });
    expect(AudioError.getData(error)).toEqual({ message: 'audio failed' });
  });

  it('ImageGenContentFilteredError includes prompt when present', () => {
    const error = new ImageGenContentFilteredError({
      message: 'blocked',
      prompt: 'a city skyline',
    });
    expect(ImageGenContentFilteredError.getData(error)).toEqual({
      prompt: 'a city skyline',
    });
  });

  it('ImageGenContentFilteredError returns empty data without prompt', () => {
    const error = new ImageGenContentFilteredError({
      message: 'blocked',
    });
    expect(ImageGenContentFilteredError.getData(error)).toEqual({});
  });

  it('ResearchError exposes message', () => {
    const error = new ResearchError({ message: 'research failed' });
    expect(ResearchError.getData(error)).toEqual({ message: 'research failed' });
  });
});
