import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPodcastScriptMarkdown,
  buildPodcastTranscriptMarkdown,
} from '../lib/export';

describe('podcast export formatting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-18T11:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sorts segments and includes summary in markdown export', () => {
    const output = buildPodcastScriptMarkdown({
      title: 'Weekly Recap',
      summary: 'Top stories and practical takeaways.',
      segments: [
        { index: 2, speaker: 'Host', line: 'Closing remarks.' },
        { index: 0, speaker: 'Host', line: 'Welcome back.' },
        { index: 1, speaker: 'Guest', line: 'Key industry update.' },
      ],
    });

    expect(output).toContain('# Weekly Recap');
    expect(output).toContain('Exported: 2026-02-18T11:00:00.000Z');
    expect(output).toContain('## Summary');
    expect(output).toContain('Top stories and practical takeaways.');

    const welcomeIdx = output.indexOf('**Host:** Welcome back.');
    const updateIdx = output.indexOf('**Guest:** Key industry update.');
    const closingIdx = output.indexOf('**Host:** Closing remarks.');

    expect(welcomeIdx).toBeGreaterThanOrEqual(0);
    expect(updateIdx).toBeGreaterThan(welcomeIdx);
    expect(closingIdx).toBeGreaterThan(updateIdx);
  });

  it('renders a placeholder when script is empty', () => {
    const output = buildPodcastScriptMarkdown({
      title: 'Empty Show',
      summary: null,
      segments: [],
    });

    expect(output).toContain('## Script');
    expect(output).toContain('_No script available._');
  });

  it('supports transcript header formatting for clipboard output', () => {
    const output = buildPodcastTranscriptMarkdown({
      title: 'Transcript Example',
      summary: null,
      segments: [{ index: 0, speaker: 'Host', line: 'Hello transcript.' }],
    });

    expect(output).toContain('## Transcript');
    expect(output).not.toContain('## Script');
  });
});
