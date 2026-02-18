import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildVoiceoverTextExport,
  buildVoiceoverTranscriptMarkdown,
} from '../lib/export';

describe('voiceover export formatting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-18T09:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('includes title, preferred voice label, and text', () => {
    const output = buildVoiceoverTextExport({
      title: 'Brand Intro',
      text: 'Welcome to our spring launch.',
      voice: 'Charon',
      voiceName: 'Studio Charon',
    });

    expect(output).toContain('Title: Brand Intro');
    expect(output).toContain('Voice: Studio Charon');
    expect(output).toContain('Exported: 2026-02-18T09:30:00.000Z');
    expect(output).toContain('Welcome to our spring launch.');
  });

  it('falls back to generic title and base voice when needed', () => {
    const output = buildVoiceoverTextExport({
      title: '   ',
      text: '  Draft narration  ',
      voice: 'Leda',
      voiceName: null,
    });

    expect(output).toContain('Title: Untitled Voiceover');
    expect(output).toContain('Voice: Leda');
    expect(output).toContain('Draft narration');
  });

  it('formats transcript markdown for clipboard copy', () => {
    const output = buildVoiceoverTranscriptMarkdown({
      title: 'Narration',
      text: 'Line one.',
      voice: 'Charon',
      voiceName: null,
    });

    expect(output).toContain('# Narration');
    expect(output).toContain('Voice: Charon');
    expect(output).toContain('Copied: 2026-02-18T09:30:00.000Z');
    expect(output).toContain('Line one.');
  });
});
